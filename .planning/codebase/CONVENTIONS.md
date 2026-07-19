# Conventions — pi-qwencloud-provider

## Code Style

### Naming

| Convention | Example |
|---|---|
| PascalCase for types/interfaces | `ModelConfig`, `AuthKeyOptions`, `QwenCloudOpenAICompat` |
| camelCase for functions/variables | `resolveApiKey`, `fetchRemoteModels`, `modelIds` |
| SCREAMING_SNAKE for constants | `DEFAULT_API_BASE`, `PROVIDER_NAME`, `ENV_API_KEY` |
| SCREAMING_SNAKE object keys for maps | `QWENCLOUD_OPENAI_COMPAT`, `QWENCLOUD_ERROR_MESSAGES` |
| `I` prefix for interfaces (selective) | Only when needed for disambiguation |

### Module headers

Every source file opens with a JSDoc block describing the module's purpose:

```typescript
/**
 * QwenCloud model definitions and dynamic model discovery.
 *
 * @module qwencloud-models
 */
```

Comment sections use `───` rulers for visual grouping:

```typescript
// ─── Model Definitions ─────────────────────────────────────────────────────
```

### TypeScript strictness

- `strict: true` in `tsconfig.json`
- All return types explicit on exported functions
- `readonly` annotations on constant arrays and tuples
- `unknown` used for parsed JSON before type-narrowing via guards
- `@module` JSDoc tags on every file

### Immutability

- `MODELS` is `readonly ModelConfig[]`
- `ThinkingLevelMap` is `Readonly<Record<...>>`
- `input` is `readonly ["text"] | readonly ["text", "image"]`
- Spread operator used for transformations (e.g., `{ ...model, compat: { ...default, ...override } }`)

### Imports

- `.js` extension on all internal imports (ESM bundler resolution)
- Types imported with `import type` when used only as types
- pi peer packages imported without version qualifiers (`@earendil-works/pi-ai`)

## Error Handling

### Provider errors (message_end pipeline)

Three-stage pipeline in `error-handler.ts`:

1. **Filter** — is this a QwenCloud error? (`stopReason === "error"` + provider match)
2. **Classify** — delegate to `errors.ts` pure function (`classifyQwenCloudError`)
3. **Deliver** — `ctx.ui.notify()` in TUI mode, `console.error` fallback otherwise

Classification in `errors.ts` uses case-insensitive substring matching against known error patterns (401, 403, 429, quota). Falls through to `"unknown"` with a generic actionable message.

### Wan API errors

- API key missing → descriptive error pointing to `QWENCLOUD_API_KEY` or `/login`
- Invalid model/size/n → validation before API call with supported values listed
- HTTP errors → status code + truncated body (300 chars)
- Malformed response → specific missing-field errors at each nesting level
- Network errors → bubble up naturally (handled by try/catch in slash command)

### Auth file errors

- ENOENT / file not found → silently skipped
- Corrupt JSON → caught, warns to console via `[qw]` prefix
- Other filesystem errors → caught but suppressed

## Patterns

### Dependency injection for testability

All I/O functions accept injectable alternatives:

```typescript
export interface AuthKeyOptions {
  env?: Record<string, string | undefined>;
  readFile?: (path: string) => string;
  fileExists?: (path: string) => boolean;
  // ...
}
```

This is used consistently across `auth.ts`, `discovery.ts`, and `wan.ts`.

### Export one concern per function

- `resolveApiKey` — one function, one concern (key resolution chain)
- `classifyQwenCloudError` — pure function, no side effects
- `handleQwenCloudError` — side-effectful delivery wrapper
- `generateWanImage` + `downloadWanImage` — split API call from file I/O

### Barrel re-export for split modules

`src/models.ts` is a pure barrel — no logic, just re-exports from `thinking.ts`, `catalog.ts`, and `discovery.ts`. This preserves backward compatibility while keeping the modules physically separate.

### Pi integration interface

The default export in `index.ts` conforms to `ExtensionAPI`:

```typescript
export default async function (pi: ExtensionAPI) {
  pi.registerProvider(...)
  pi.on("message_end", ...)
  pi.registerCommand(...)
}
```

Validated at compile time by `tests/type/contract.ts`.
