# Integrations — pi-qwencloud-provider

## QwenCloud API

### Endpoint

```
https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
```

Overridable via `QWENCLOUD_API_BASE` env var.

### API Protocol

**OpenAI-compatible Chat Completions** (`api: "openai-completions"` in pi). pi's built-in streaming handler manages SSE, tool calls, and usage tracking.

Key endpoints:
- `POST /chat/completions` — chat completions with `reasoning_effort` support
- `GET /models` — model discovery (OpenAI-compatible format)

### Authentication

**Bearer token** (`Authorization: Bearer <key>`). Static API keys — no OAuth, no token refresh, no session management.

Key resolution order (`src/auth.ts` → `resolveApiKey`):
1. Explicit key argument
2. `QWENCLOUD_API_KEY` env var
3. `~/.pi/agent/auth.json` → `{ "qwencloud": "<key>" }` or `{ "apiKey": "<key>" }`

### Supported Models

| Model | Type | Reasoning |
|-------|------|-----------|
| `qwen3.8-max-preview` | Text | ✅ low/medium/high |
| `qwen3.7-plus` | Text | ✅ low/medium/high |
| `qwen3.7-max` | Text | ✅ low/medium/high |
| `qwen3.6-flash` | Text | ✅ low/medium/high |
| `deepseek-v4-pro` | Text | ✅ high only |
| `glm-5.2` | Text | ✅ low/medium/high/xhigh |
| `wan2.7-image` | Image gen | ❌ |
| `wan2.7-image-pro` | Image gen | ❌ |
| `happyhorse-1.1-i2v` | Video gen | ❌ |
| `happyhorse-1.1-t2v` | Video gen | ❌ |
| `happyhorse-1.1-r2v` | Video gen | ❌ |

Note: Image/video models use separate API endpoints, not chat/completions. Included in catalog for discovery.

### Reasoning (`reasoning_effort`)

Verified against live API (2026-07-19):
- `"none"` — accepted, explicitly disables reasoning
- `"low"`, `"medium"`, `"high"` — accepted
- Omitting parameter — does **not** disable reasoning (qwen3.7-plus still reasons)

### Rate Limits

Token Plan credit-based (per `home.qwencloud.com`):
- Lite: 700 Credits / 5h, 2,500 / 7d
- Standard: 3,000 / 5h, 10,000 / 7d
- Pro: 12,000 / 5h, 40,000 / 7d

### Error Codes

| Code | Classification | User Message |
|------|---------------|--------------|
| 401 | `auth_invalid` | Invalid API key |
| 403 | `auth_expired` | Plan expired |
| 429 | `rate_limited` | Rate limit / credit exhaustion |
| Quota | `insufficient_quota` | Usage exceeded |

## pi Platform

### Extension API

Entry: `src/index.ts` → default export `(api: ExtensionAPI) => Promise<void>`

Registers via:
- `pi.registerProvider("qwencloud", { ... })` — provider config
- `pi.on("message_end", handler)` — error surface

### OAuth Flow

Simple browser-assisted paste (no OAuth protocol):
1. Opens `https://home.qwencloud.com`
2. Prompts user to paste API key
3. Returns static credentials (10-year expiry, never refreshed)

### Model Registration

Models exposed as `qwencloud/<slug>` (e.g. `qwencloud/qwen3.7-plus`). pi invokes via `--model qwencloud/qwen3.7-plus`.
