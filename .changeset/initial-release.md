---
"pi-qwencloud-provider": minor
---

feat: initial release — QwenCloud provider for pi

Adds the QwenCloud Token Plan as a pi provider with 11 models:
- 6 text/chat models: qwen3.8-max-preview, qwen3.7-plus, qwen3.7-max,
  qwen3.6-flash, deepseek-v4-pro, glm-5.2
- 2 image generation models: wan2.7-image, wan2.7-image-pro
- 3 video generation models: happyhorse-1.1-i2v, happyhorse-1.1-t2v,
  happyhorse-1.1-r2v

Features:
- OpenAI-compatible chat completions via QWENCLOUD_API_KEY
- reasoning_effort support (low/medium/high/none) verified against live API
- Dynamic model discovery from /models endpoint with static fallback
- Simple API-key login flow (no OAuth)
- User-friendly error classification (401/403/429/quota)
- 86 unit tests + E2E smoke tests
