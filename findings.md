# Research Findings — QwenCloud Provider Open Questions

Date: 2026-07-19
Sources: docs.qwencloud.com, alibabacloud.com/help (Model Studio / DashScope), third-party pricing aggregators.

## Q1 — Does QwenCloud support `reasoning_effort: "none"` to disable reasoning?

**No — not as a `reasoning_effort` value on the chat/completions path. The current `off` → `null` mapping is correct for that path.**

- The chat completions API uses different parameters per model family:
  - **Qwen models**: `enable_thinking` (boolean) + `thinking_budget`. Docs state
    "`reasoning.effort` takes precedence over `enable_thinking`. Use `reasoning.effort`,
    as `enable_thinking` will be deprecated." Chat `reasoning_effort` values are
    `low` / `medium` / `high` / `xhigh` (default `high` on the Responses API).
  - **DeepSeek-V4 / GLM series**: effort via `reasoning_effort` with valid values
    `high` / `max` only — "`low` and `medium` are mapped to `high`, and `xhigh` is
    mapped to `max`" (docs.qwencloud.com/api-reference/chat/dashscope).
- The **OpenAI Responses API** (separate endpoint) supports `reasoning.effort: "none"`
  to disable thinking — but this provider wires `api: "openai-completions"`, not Responses.
- The OpenAI-compatible chat path has **no documented `"none"` value**. Disabling thinking
  is done via `enable_thinking: false` (Qwen) or by omitting `reasoning_effort`
  (DeepSeek/GLM default to `high`).

**Code implication:**

- Mapping pi `off` → `null` (omit param) is reasonable for Qwen.
- Mismatch: `DEEPSEEK_V4_THINKING_MAP` sends `xhigh` as `reasoning_effort`, but the chat
  API only accepts `high`/`max` for DeepSeek. `xhigh` is not a valid chat value.
  Consider mapping `xhigh` → `"max"` for DeepSeek (or rely on the server's documented
  `low/medium→high, xhigh→max` mapping).

## Q2 — Does `/models` return non-chat models (Wan, HappyHorse)?

**Yes. Wan and HappyHorse appear in the model catalog, and the `qwencloud/` prefix filter
can include them, but they are NOT chat/completions models.**

- Image/video models (Wan, HappyHorse) are served via **separate async task APIs**
  (`/services/aigc/video-generation/video-synthesis`, `/services/aigc/image-generation/generation`),
  not `/chat/completions`.
- Official docs: "image generation models such as Qwen-Image ... do not support
  OpenAI-compatible (compatible-mode) mode, so they cannot be used directly."
- `fetchRemoteModels` filters by `id.startsWith("qwencloud/")` and registers every match as
  a `ModelConfig` through `openai-completions`. A Wan/HappyHorse model would appear
  selectable but fail on every chat request.

**Code implication:**

- The `qwencloud/` prefix alone is insufficient. Discovery/fallback should exclude known
  non-chat families (`wan`, `happyhorse`, `qwen-image`) or only register chat-serving models.
- The static `MODELS` catalog already marks Wan/HappyHorse as catalog-only
  (`contextWindow: 0`, `maxTokens: 0`), but the **dynamic** fetch path does not apply that guard.

## Q3 — Exact Token Plan pricing

The hardcoded estimates in `src/models.ts` are **partly wrong / stale**. Official QwenCloud
Token Plan list prices (docs.qwencloud.com/developer-guides/getting-started/pricing,
per 1M tokens, Singapore endpoint):

| Model slug        | Code (in/out) | Official list price                                                                      |
| ----------------- | ------------- | ---------------------------------------------------------------------------------------- |
| `qwen3.7-max`     | 2.5 / 7.5     | 2.50 / 7.50 (0–991K) ✅ matches                                                          |
| `qwen3.7-plus`    | 0.4 / 1.6     | ≤256K 0.40 / 1.60; 256K–1M 1.20 / 4.80 (tiered) ⚠️ entry tier only                       |
| `qwen3.6-flash`   | 0.07 / 0.14   | ≤256K 0.25 / 1.50; 256K–1M 1.00 / 4.00 ❌ **overpriced**                                 |
| `deepseek-v4-pro` | 1.74 / 3.48   | Alibaba China aggregator: 0.435 / 0.87; Token Plan not separately listed ❌ likely wrong |
| `glm-5.2`         | 1.4 / 4.4     | Alibaba China: 1.10 / 3.85, cache read 0.275 ❌ **overpriced**                           |

Key corrections:

- **`qwen3.6-flash` is significantly overpriced in code** (0.07/0.14 vs official 0.25/1.50).
  The 0.07 input figure looks copied from an older `qwen-flash` / `qwen3.5-flash` rate.
- **`glm-5.2` and `deepseek-v4-pro` estimates are too high** vs published Alibaba rates.
  QwenCloud Token Plan rates for these are not in the doc found, so they remain unconfirmed
  for the Token Plan specifically — safest fix is to fetch live pricing from `/models` or
  mark them as estimates.
- Pricing is **tiered by input length** for long-context models, which the flat `cost`
  object cannot represent.
- `qwen3.8-max-preview` is not in the official Token Plan pricing table (which tops out at
  `qwen3.7-max`). The code's model list may be ahead of / divergent from the published catalog.

## Recommended next actions (not yet applied)

1. Fix `qwen3.6-flash` cost → 0.25 / 1.50; correct `glm-5.2` → ~1.10 / 3.85;
   flag `deepseek-v4-pro` as unconfirmed estimate.
2. In `fetchRemoteModels`, exclude non-chat families (`wan`, `happyhorse`, `qwen-image`)
   so they are not registered as chat models.
3. Keep `off` → `null`, but for DeepSeek map `xhigh` → `"max"` (or rely on server mapping).
