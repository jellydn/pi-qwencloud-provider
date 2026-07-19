# Architecture — pi-qwencloud-provider

## Pattern

**Pure-logic IOC (Inversion of Control)** — all I/O is injectable for testability. Modules accept options objects with injectable `fetch`, `readFile`, `fileExists`, `homeDir`, etc. No side effects at import time.

## Layer Diagram

```
┌──────────────────────────────────────────────┐
│                  pi Platform                   │
│         (ExtensionAPI, OAuth, streaming)      │
└─────────────────────┬────────────────────────┘
                      │ registerProvider / on("message_end")
┌─────────────────────▼────────────────────────┐
│               src/index.ts                     │
│        Entry point, wires everything          │
│  - resolveApiBase() → resolveApiKey()         │
│  - resolveModels() → registerProvider()       │
│  - pi.on("message_end", errorHandler)         │
└──┬────────┬────────┬────────┬────────────────┘
   │        │        │        │
   ▼        ▼        ▼        ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────────────┐
│ env  │ │ auth │ │models│ │ error-handler │
│      │ │      │ │      │ │      │        │
│consts│ │keys  │ │static│ │ errors.ts    │
│base  │ │files │ │+dyn  │ │ classify     │
│sanit │ │      │ │fetch │ │              │
└──────┘ └──┬───┘ └──────┘ └──────────────┘
            │
       ┌────▼────┐
       │  utils   │
       │  guards  │
       └─────────┘

┌──────────┐
│  oauth    │
│  login    │
│  refresh  │
│  getKey   │
└───────────┘
```

## Module Dependency Graph

```
index.ts
 ├── env.ts         (constants, resolveApiBase, sanitizeApiKey)
 ├── auth.ts        → utils.ts, env.ts
 ├── models.ts      → utils.ts, env.ts
 ├── oauth.ts       → env.ts
 ├── error-handler.ts → errors.ts, env.ts
 └── errors.ts      (self-contained)

No circular dependencies. utils.ts is the only shared dependency.
```

## Key Abstractions

### `src/env.ts` — Constants & Base Resolution

| Export | Purpose |
|--------|---------|
| `PROVIDER_NAME` | `"qwencloud"` |
| `ENV_API_KEY` | `"QWENCLOUD_API_KEY"` |
| `DEFAULT_API_BASE` | Token Plan endpoint |
| `resolveApiBase(env?)` | Override via `QWENCLOUD_API_BASE` |
| `sanitizeApiKey(input)` | Strip paste wrappers + control chars |
| `buildEndpointUrl(base)` | Append `/chat/completions` |

### `src/auth.ts` — API Key Resolution

- `resolveApiKey(providedKey?, options?)` — priority chain
- `walkAuthPaths(options, extract)` — generic JSON file walker
- `defaultAuthPaths(home)` — `~/.pi/agent/auth.json`

### `src/models.ts` — Model Catalog

- `MODELS` — 11 static models with full metadata
- `ThinkingLevelMap` — 6-level matrix (off/minimal/low/medium/high/xhigh)
- `fetchRemoteModels(options)` — dynamic `/models` fetch (5s timeout)
- `resolveModels(apiKey, options)` — remote-first, static fallback

### `src/oauth.ts` — Login Flow

- `login(callbacks)` — open dashboard, prompt paste
- `refreshToken(creds)` — no-op (static keys don't expire)
- `getApiKey(creds)` — returns `credentials.access`

### `src/errors.ts` + `src/error-handler.ts` — Error Surface

- `classifyQwenCloudError(message)` → `{ type, message }`
- `handleQwenCloudError(event, ctx)` — filter → classify → notify

### `src/utils.ts` — Type Guards

- `isRecord`, `stringValue`, `numberValue`, `booleanValue`

## Data Flow

```
User runs pi /login
  → oauth.ts: login()
    → Opens https://home.qwencloud.com
    → Prompts for API key
    → Returns OAuthCredentials (10yr expiry)

pi makes chat request
  → openai-completions handler
    → Auth: Bearer <key from credentials or env>
    → Model: qwencloud/<slug>
    → reasoning_effort: from thinkingLevelMap
    → POST https://.../compatible-mode/v1/chat/completions

On error:
  → message_end event fires
  → error-handler.ts filters for qwencloud
  → errors.ts classifies (401/403/429/quota)
  → ctx.ui.notify() or console.error()
```

## Entry Points

| Path | Purpose |
|------|---------|
| `src/index.ts` | pi extension entry (default export) |
| `tests/unit/*.test.ts` | Unit tests (Vitest) |
| `tests/type/contract.ts` | Compile-time ExtensionAPI contract |
| `tests/e2e/smoke.sh` | API smoke test (curl) |
