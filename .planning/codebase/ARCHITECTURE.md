# Architecture — pi-qwencloud-provider

## Pattern: Pure-logic / IOC separation

Every module that touches I/O accepts injectable dependencies (fetch, file read, env) so the logic is testable without the pi runtime. This is the same pattern as the clinepass provider (ADR 0002).

## Module Graph

```
index.ts (entry — ExtensionAPI)
  ├── env.ts      (constants + resolveApiBase)
  ├── auth.ts     (resolveApiKey — env var + auth.json walk)
  ├── models.ts   (barrel re-export)
  │   ├── thinking.ts   (reasoning-effort maps + translation interface)
  │   ├── catalog.ts    (static model data + compat + filtering)
  │   └── discovery.ts  (fetch / parse / resolveModels)
  ├── oauth.ts    (login flow, sanitizeApiKey, static credential helpers)
  ├── error-handler.ts  (filter → classify → deliver via message_end event)
  │   └── errors.ts     (classification logic — pure functions)
  ├── wan.ts      (Wan image generation API call + download)
  └── utils.ts    (isRecord, stringValue, numberValue, booleanValue)
```

## Data Flow

### Chat Completions (provider streaming)

```
pi agent
  → QwenCloud /chat/completions (SSE)
  → pi's openai-completions streaming (built-in)
  → on "message_end" → handleQwenCloudError → classifyQwenCloudError
  → ctx.ui.notify (friendly message) or console.error fallback
```

### Model Discovery (startup)

```
index.ts default export
  → resolveApiKey()              // auth.ts
  → resolveModels(apiKey, ...)   // discovery.ts
      → fetchRemoteModels()       // GET /models (5s timeout)
          → parseRemoteModel()    // fallback: static catalog
      → fallback: MODELS array    // catalog.ts
  → pi.registerProvider("qw", { models })
```

### Wan Image Generation (slash command)

```
pi /wan <prompt>
  → wan.ts generateAndDownloadWanImage()
      → generateWanImage()      // POST Wan endpoint
      → downloadWanImage()       // GET OSS URL → local file
  → ctx.ui.notify("Wan image saved: ...")
```

## Key Design Decisions

1. **Barrel re-export for models** (`src/models.ts`). The old 445-line monolithic models.ts was split into `thinking.ts` (reasoning maps), `catalog.ts` (data), and `discovery.ts` (I/O). The barrel preserves all existing exports so no consumer changes.

2. **`reasoningEffortFor(map, level)`** — single translation interface for pi thinking levels → provider reasoning_effort values. Both catalog and discovery use the same maps through the same import surface.

3. **Collapsed walkAuthPaths** — the generic `<T>/extract` seam was removed; walk logic inlined into `resolveApiKey`. Injectable I/O handles kept.

4. **Error surface separation** — `errors.ts` is pure classification (testable); `error-handler.ts` is side-effectful delivery (pi event handler).

5. **Provider name "qw"** — short name avoids model-id clashes with the clinepass provider (both have `deepseek-v4-pro` and `glm-5.2`).

6. **NON_CHAT_FAMILIES filter** — Wan (image) and HappyHorse (video) models are in the catalog but excluded from chat completions discovery.
