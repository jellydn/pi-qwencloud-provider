# Changelog

## 0.1.0

Initial release — QwenCloud provider for pi.

### Models

- **Text/Chat**: qwen3.8-max-preview, qwen3.7-plus, qwen3.7-max, qwen3.6-flash, deepseek-v4-pro, glm-5.2
- **Image Generation**: wan2.7-image, wan2.7-image-pro
- **Video Generation**: happyhorse-1.1-i2v, happyhorse-1.1-t2v, happyhorse-1.1-r2v

### Features

- OpenAI-compatible chat completions via `QWENCLOUD_API_KEY`
- `reasoning_effort` support (low/medium/high/none) — verified against live API
- Dynamic model discovery from `/models` endpoint with static fallback
- Simple API-key login flow (no OAuth required)
- User-friendly error classification: 401 (invalid key), 403 (plan expired), 429 (rate limited), quota exceeded
- Non-chat models (Wan, HappyHorse) filtered from dynamic discovery
- 86 unit tests + E2E smoke tests
