# Conventions — pi-qwencloud-provider

## Code Style

### Language

- **TypeScript 7.x** strict mode — all `strict: true` flags enabled
- **ESM only** — `"type": "module"`, `.js` extensions in imports
- **No classes** — pure functions throughout
- **No `any`** — `unknown` with type guards for external data

### Formatting

- **oxfmt** — zero-config formatter, enforced via pre-commit
- No manual formatting rules — oxfmt handles everything

### Linting

- **oxlint** with plugins: `typescript`, `unicorn`, `oxc`, `import`, `jest`
- `unicorn/consistent-function-scoping` disabled in test files

## Import Conventions

### External

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { OAuthCredentials, OAuthLoginCallbacks } from "@earendil-works/pi-ai";
```

Type-only imports use `import type`. Peer deps are dev-only.

### Node.js Built-ins

```typescript
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
```

Always use `node:` prefix.

### Internal (Relative)

```typescript
import { resolveApiBase, PROVIDER_NAME, ENV_API_KEY } from "./env.js";
import { isRecord, stringValue, numberValue, booleanValue } from "./utils.js";
```

Always use `.js` extensions (ESM resolution). Sorted: external → node → internal.

## Naming

| Kind | Convention | Example |
|------|-----------|---------|
| Constants | `UPPER_SNAKE_CASE` | `DEFAULT_API_BASE`, `PROVIDER_NAME` |
| Functions | camelCase | `resolveApiKey`, `fetchRemoteModels` |
| Types/Interfaces | PascalCase | `ModelConfig`, `AuthKeyOptions` |
| Type aliases | PascalCase | `ThinkingLevel`, `ThinkingLevelMap` |
| Files | kebab-case | `error-handler.ts`, `models.ts` |
| Test files | `*.test.ts` | `auth.test.ts` |

## Patterns

### Dependency Injection for Testing

All I/O is injectable via options objects:

```typescript
export interface AuthKeyOptions {
  env?: Record<string, string | undefined>;
  authPaths?: readonly string[];
  readFile?: (path: string) => string;
  fileExists?: (path: string) => boolean;
  homeDir?: () => string;
}

export function resolveApiKey(
  providedKey?: string,
  options: AuthKeyOptions = {},
): string | undefined {
  const readFile = options.readFile ?? ((p: string) => readFileSync(p, "utf-8"));
  // ...
}
```

Tests inject mock functions; production uses defaults (Node.js built-ins + `process.env`).

### Generic File Walkers

`walkAuthPaths<T>` in `auth.ts` is a reusable JSON-file-traversal utility with an extractor callback. The same pattern is used in ClinePass's `auth.ts` for both `resolveApiKey` and `resolveClineAuthCredentials`.

### Fallback Chains

```typescript
// API key: explicit → env var → auth files
if (providedKey) return providedKey;
if (env[ENV_API_KEY]) return env[ENV_API_KEY];
return walkAuthPaths(options, extract);

// Models: remote fetch → static catalog
if (apiKey) {
  const remote = await fetchRemoteModels({ ...options, apiKey });
  if (remote) return remote;
}
return MODELS;
```

### Error Filter → Classify → Deliver

```typescript
export function handleQwenCloudError(event, ctx) {
  // 1. Filter: is it our provider + an error?
  if (msg.provider !== PROVIDER_NAME) return;
  if (msg.stopReason !== "error") return;

  // 2. Classify
  const { message } = classifyQwenCloudError(msg.errorMessage);

  // 3. Deliver
  ctx.hasUI ? ctx.ui.notify(message, "error") : console.error(message);
}
```

## Documentation

- Every module has a `@module` JSDoc tag
- Every exported function has a JSDoc description
- `src/index.ts` has a comprehensive module header with setup instructions
- ADRs and implementation notes in `.planning/`

## Git

- Conventional commits (implied by changesets)
- `main` branch only (no develop/staging)
- `.npmignore` excludes dev-only dirs from published package
