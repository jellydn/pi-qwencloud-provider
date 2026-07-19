# QwenCloud Provider for pi — Project Notes

## References

- **QwenCloud Dashboard:** https://home.qwencloud.com
- **QwenCloud API Docs:** https://docs.qwencloud.com/developer-guides/getting-started/introduction
- **Base Repository (ClinePass):** https://github.com/jellydn/pi-clinepass-provider

## Architecture Decisions

1. **No OAuth — static API keys only.** Unlike ClinePass (which has WorkOS OAuth via Cline CLI), QwenCloud uses simple API keys. This eliminates the need for `workos.ts`, simplifies `oauth.ts`, and removes credential extraction from Cline CLI config files.

2. **`supportsDeveloperRole: true`.** QwenCloud's OpenAI-compatible API supports the `developer` role. This differs from ClinePass which rejects it.

3. **`off: "none"` in thinking level maps.** Smoke-tested against live API (2026-07-19): QwenCloud's OpenAI-compatible endpoint at `token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` **accepts `reasoning_effort: "none"`** and returns a clean response. Additionally, omitting `reasoning_effort` entirely does NOT disable reasoning for qwen3.7-plus — the model still produces reasoning_content. Therefore `off` must map to `"none"` (not `null`). This matches the ClinePass convention.

4. **Image/video models in catalog with placeholders.** Wan2.7 and HappyHorse models use separate API endpoints (image/video generation), not chat/completions. They're included with placeholder `contextWindow: 8192` and `maxTokens: 4096` to avoid zero-value issues in pi's UI.

## Smoke Test Results (2026-07-19)

Ran 7 tests against live API with Token Plan Lite key:

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | GET /models | ✅ 200 | ~11 model IDs returned. qwen3.7-plus, qwen3.6-flash, deepseek-v4-pro, glm-5.2 all found |
| 2 | Basic chat (qwen3.6-flash, no reasoning) | ✅ 200 | "hello world" |
| 3 | reasoning_effort=low (qwen3.7-plus) | ✅ 200 | Reasoning present in response |
| 4 | reasoning_effort=high (qwen3.7-plus) | ✅ 200 | Works |
| 5 | No reasoning_effort (qwen3.7-plus) | ✅ 200 | **Reasoning still present** — omitting does NOT disable |
| 6 | reasoning_effort="none" (qwen3.7-plus) | ✅ 200 | **Accepted!** Response: "Four" |
| 7 | deepseek-v4-pro, reasoning_effort=high | ✅ 200 | Works |

**Key conclusions:**
- `reasoning_effort` IS supported on QwenCloud's OpenAI-compatible endpoint
- `"none"` is a valid value — use it to disable reasoning
- Omitting the parameter does NOT disable reasoning for qwen3.7-plus
- Dynamic model discovery via `/models` works


## Differences from ClinePass

| Feature | ClinePass | QwenCloud |
|---------|-----------|-----------|
| Auth | WorkOS OAuth + static API keys | Static API keys only |
| API base | `https://api.cline.bot/api/v1` | Token Plan endpoint |
| Model prefix | `cline-pass/` | None — bare API names (pi scopes via `qwencloud/<id>`) |
| Thinking off | Maps to `"none"` | Maps to `"none"` (verified) |
| Developer role | Not supported | Supported |
| Error types | not_subscribed, auth_expired, rate_limited | + insufficient_quota |
| Dynamic models | `/api/v1/models` | `/models` |
