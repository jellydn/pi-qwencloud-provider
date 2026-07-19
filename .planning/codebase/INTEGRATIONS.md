# Integrations — pi-qwencloud-provider

## External APIs

### QwenCloud Token Plan API

| Item | Value |
|---|---|
| Base URL | `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` |
| Override env var | `QWENCLOUD_API_BASE` |
| Auth | `Authorization: Bearer <apiKey>` header |
| Key env var | `QWENCLOUD_API_KEY` |

**Endpoints used:**

| Endpoint | Module | Method | Purpose |
|---|---|---|---|
| `/chat/completions` | pi's `openai-completions` | POST (SSE) | Text/vision chat, reasoning, tool calls |
| `/models` | `discovery.ts` | GET | Dynamic model list (5s timeout) |
| `/api/v1/services/aigc/multimodal-generation/generation` | `wan.ts` | POST | Wan image generation (synchronous) |

### Wan Image Generation (separate API)

- Not chat/completions — synchronous REST endpoint derived from the same host
- Models: `wan2.7-image` (up to 2K), `wan2.7-image-pro` (up to 4K)
- Generated image URLs are OSS presigned URLs — expire in ~24h
- Images downloaded immediately and saved to local disk
- Accessed via pi slash command `/wan`, not through provider streaming

## Authentication

Static API keys only — no OAuth, no WorkOS, no token refresh.

**Resolution order** (`auth.ts`):
1. Explicit key argument
2. `QWENCLOUD_API_KEY` environment variable
3. `~/.pi/agent/auth.json` — `{ "apiKey": "..." }` or `{ "qw": "..." }` or `{ "qw": { "access": "..." } }`

**Login flow** (`oauth.ts`):
1. Opens `home.qwencloud.com` in browser
2. Prompts user to paste API key (sanitized for terminal paste wrappers)
3. Stores as static credential (10-year expiry, never refreshes)

## pi Integration Points

| Integration | Module | Mechanism |
|---|---|---|
| Provider registration | `index.ts` | `pi.registerProvider("qw", { api: "openai-completions", ... })` |
| OAuth/login | `oauth.ts` | `login()`, `refreshToken()`, `getApiKey()` |
| Error surface | `error-handler.ts` | `pi.on("message_end", handleQwenCloudError)` — filter → classify → deliver |
| Wan slash command | `index.ts` | `pi.registerCommand("wan", { handler })` |

## No External Dependencies

The provider uses only Node.js standard library modules (`node:fs`, `node:os`, `node:path`, `node:fs/promises`). No npm runtime dependencies beyond the pi peer packages.
