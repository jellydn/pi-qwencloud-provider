# Changelog

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

> **Model availability**: `deepseek-v4-pro` is **not confirmed** against the live API — a request to `qwencloud/deepseek-v4-pro` returned `404 model_not_found` at publish time. The catalog lists it as a reference entry; verify the exact slug via the `/models` endpoint or your QwenCloud Token Plan before relying on it.
