# Concerns — pi-qwencloud-provider

## Open Questions

### 1. `reasoning_effort` vs `enable_thinking`

**Severity:** Medium | **File:** `src/models.ts`

Research indicates QwenCloud's native DashScope API uses `enable_thinking` (true/false), not `reasoning_effort` (low/medium/high/none). However, smoke testing confirmed the OpenAI-compatible endpoint **does accept `reasoning_effort`** including `"none"`.

*Risk:* If QwenCloud changes their OpenAI-compatible layer to align with native DashScope, `reasoning_effort` could stop working. The `enable_thinking` parameter requires `extra_body` in OpenAI SDK, which pi may not support.

### 2. Image/Video Models in Chat Catalog

**Severity:** Low | **File:** `src/models.ts`

`wan2.7-image`, `wan2.7-image-pro`, and `happyhorse-*` models use separate API endpoints (image/video generation), not `/chat/completions`. They're included with placeholder `contextWindow: 8192` / `maxTokens: 4096` to avoid zero-value issues.

*Risk:* pi's model selector shows these models. If a user selects one for chat, the API will return an error. No way to filter them from the chat model list without pi platform changes.

### 3. Pricing Estimates are Approximate

**Severity:** Low | **File:** `src/models.ts`

Cost values in the static catalog are estimates based on publicly available Qwen pricing. QwenCloud's Token Plan uses credit-based billing (not per-token), so these values are only used for pi's usage display.

*Risk:* Misleading cost estimates in pi's UI. Token Plan users see credit consumption, not dollar costs.

### 4. 403 Error Classification is Broad

**Severity:** Low | **File:** `src/errors.ts`

All 403 errors are classified as `auth_expired` ("plan expired"). A 403 from QwenCloud could also mean:
- Model not available on your plan
- Region restrictions
- Access denied for a specific model

*Risk:* Users get a misleading "plan expired" message when the real issue is model access.

### 5. No Dynamic Model Discovery for Image/Video

**Severity:** Low | **File:** `src/models.ts`

The `/models` endpoint filter (`id.startsWith("qwencloud/")`) would match Wan and HappyHorse models if they appear in the API response. If the remote `/models` endpoint returns them, they'll be registered as chat models.

*Mitigation:* Static catalog includes them with proper metadata. Remote models without a static fallback would get `DEFAULT_THINKING_LEVEL_MAP` and `reasoning: true` (the default), which is inaccurate for image/video models.

### 6. No Streaming E2E Test

**Severity:** Low | **File:** `tests/e2e/smoke.sh`

The smoke test only tests non-streaming chat completions. pi uses SSE streaming (`api: "openai-completions"`). The streaming path hasn't been verified against QwenCloud's API.

*Risk:* Streaming could have subtle differences (SSE format, chunk delimiters, finish reasons) that only surface in pi.

### 7. Auth File Warning on Malformed JSON

**Severity:** Trivial | **File:** `src/auth.ts`

When `~/.pi/agent/auth.json` contains invalid JSON, `walkAuthPaths` logs a `console.warn`. This is visible in test output ("skips malformed auth.json" test). Expected behavior, but could be noisy in production if users have corrupted auth files.

## Design Debt

### Generic `walkAuthPaths` is Reusable but Coupled

The `walkAuthPaths` function in `auth.ts` was adapted from ClinePass. While functional, it mixes file-system concern with JSON parsing and extraction logic. Future refactors could separate these.

### No Error Classification Tests for `insufficient_quota`

The `errors.test.ts` covers `insufficient_quota` classification, but no `error-handler.test.ts` test specifically covers quota errors being surfaced via `ctx.ui.notify`. All error types share the same code path, so this is low risk.

## Security

- **API key in env**: `QWENCLOUD_API_KEY` is standard. pi uses `$QWENCLOUD_API_KEY` sigil for runtime resolution.
- **No key logging**: `sanitizeApiKey` strips paste wrappers. `resolveApiKey` never logs key contents.
- **Auth file parsing**: JSON.parse with try/catch. Corrupt files produce warnings without exposing contents.
- **No secrets in repo**: `.gitignore` excludes `node_modules`. No hardcoded keys.
