# Concerns — pi-qwencloud-provider

## Resolved

### 1. `reasoning_effort` vs `enable_thinking` ✅ (verified)

**Severity:** ~~Medium~~ Resolved | **File:** `src/models.ts`

Smoke-tested against live API (2026-07-19): QwenCloud's OpenAI-compatible endpoint at `token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` **accepts `reasoning_effort`**, including `"none"`. Additionally, omitting the parameter does NOT disable reasoning — `"none"` is required. Therefore `off` maps to `"none"` in all thinking maps.

*Residual risk:* If QwenCloud aligns their OpenAI-compatible layer with native DashScope's `enable_thinking`, `reasoning_effort` could stop working. Monitor API behavior on updates.

### 2. Image/Video Models in Chat Catalog ✅ (mitigated)

**Severity:** ~~Low~~ Resolved | **File:** `src/models.ts`

`fetchRemoteModels` now filters out non-chat families (`wan`, `happyhorse`, `qwen-image`) via `isNonChatModel()`, preventing dynamic registration. The static catalog intentionally retains them (user requested "all models") with `reasoning: false` and placeholder context/maxTokens values.

*Residual risk:* pi's model selector still shows these from the static catalog. Selecting one for chat will return an API error. Mitigation would require pi platform changes to filter by model capability.

### 3. Pricing Estimates ✅ (corrected)

**Severity:** ~~Low~~ Resolved | **File:** `src/models.ts`

Pricing corrected based on research findings (findings.md):
- `qwen3.6-flash`: 0.07/0.14 → 0.25/1.50 (official Token Plan ≤256K tier)
- `glm-5.2`: 1.4/4.4 → 1.10/3.85, cacheRead 0.26 → 0.275
- `deepseek-v4-pro`: flagged as unconfirmed estimate in comments

Note: Token Plan uses credit-based billing, not per-token. These values are for pi's usage display only.

### 5. No Dynamic Model Discovery Filter for Non-Chat ✅ (fixed)

**Severity:** ~~Low~~ Resolved | **File:** `src/models.ts`

Added `NON_CHAT_FAMILIES` array and `isNonChatModel()` function with case-insensitive matching. `fetchRemoteModels` now excludes models whose IDs contain `wan`, `happyhorse`, or `qwen-image`.

## Still Open

### 4. 403 Error Classification is Broad

**Severity:** Low | **File:** `src/errors.ts`

All 403 errors are classified as `auth_expired` ("plan expired"). A 403 from QwenCloud could also mean:
- Model not available on your plan
- Region restrictions
- Access denied for a specific model

*Risk:* Users get a misleading "plan expired" message when the real issue is model access. Consider adding more pattern matching to distinguish plan-expired 403s from other 403s.

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
