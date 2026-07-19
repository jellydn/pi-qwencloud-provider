# Changelog

## 0.1.2

Critical bug fixes found during real-world pi testing.

### Fixed

- **Provider name renamed from `qwencloud` to `qw`** — avoids model name clashes with the clinepass provider (both have `deepseek-v4-pro` and `glm-5.2`). pi's model resolution checks all providers; the short unique name disambiguates. Users reference models as `qw/qwen3.7-plus`, `qw/deepseek-v4-pro`, etc.
- **Model IDs are now bare API names** — dropped the `qwencloud/` prefix from internal model IDs (e.g., `qwencloud/deepseek-v4-pro` → `deepseek-v4-pro`). pi scopes via the provider name; the API gets the correct bare model name.
- **`supportsDeveloperRole: false`** — QwenCloud rejects the `developer` role (400 error). pi now sends `system` instead, matching the ClinePass pattern.

## 0.1.1

Bug fixes based on research findings and API smoke testing.

### Fixed

- DeepSeek V4 Pro: `xhigh` now maps to `"max"` instead of `"high"` (chat API only accepts `high`/`max`)
- `fetchRemoteModels` now excludes non-chat model families (`wan`, `happyhorse`, `qwen-image`) from dynamic discovery
- Pricing corrections: `qwen3.6-flash` (0.25/1.50), `glm-5.2` (1.10/3.85); `deepseek-v4-pro` flagged as unconfirmed estimate
- `isNonChatModel` filter now uses case-insensitive matching

## 0.1.0

Initial release — QwenCloud provider for pi.

### Models

- **Text/Chat**: qwen3.8-max-preview, qwen3.7-plus, qwen3.7-max, qwen3.6-flash, deepseek-v4-pro, glm-5.2
- **Image Generation**: wan2.7-image, wan2.7-image-pro
- **Video Generation**: happyhorse-1.1-i2v, happyhorse-1.1-t2v, happyhorse-1.1-r2v

### Features

- OpenAI-compatible chat completions via `QWENCLOUD_API_KEY`
- `reasoning_effort` support (low/medium/high/xhigh) — Qwen family uses `enable_thinking`/`thinking_budget`; DeepSeek/GLM use `reasoning_effort` (`high`/`max`). There is **no** `none` value on the chat/completions path; `off` omits the param (model default)
- Dynamic model discovery from `/models` endpoint with static fallback
- Simple API-key login flow (no OAuth required)
- User-friendly error classification: 401 (invalid key), 403 (plan expired), 429 (rate limited), quota exceeded
- Non-chat models (Wan, HappyHorse) filtered from dynamic discovery
- 86 unit tests + E2E smoke tests

> **Model availability**: All catalog slugs (qwen3.8-max-preview, qwen3.7-plus/max, qwen3.6-flash, deepseek-v4-pro, glm-5.2, wan2.7-image[-pro], happyhorse-1.1-i2v/t2v/r2v) match the official QwenCloud Token Plan model list. If a request returns `404 model_not_found`, it is a transient plan/API issue — re-run `pi /login` and confirm your plan status at home.qwencloud.com.
