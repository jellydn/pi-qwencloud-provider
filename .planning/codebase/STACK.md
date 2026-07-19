# Stack — pi-qwencloud-provider

## Runtime

| Component | Version/Details |
|-----------|-----------------|
| **Language** | TypeScript 7.x (strict mode) |
| **Runtime** | Node.js ≥22 |
| **Module system** | ESM (`"type": "module"`) |
| **Target** | ES2022 |
| **Module resolution** | bundler |

## Dependencies

### Peer (pi platform)

| Package | Purpose |
|---------|---------|
| `@earendil-works/pi-ai` | OAuth types (`OAuthCredentials`, `OAuthLoginCallbacks`) |
| `@earendil-works/pi-coding-agent` | `ExtensionAPI` type, `registerProvider`, event hooks |

### Dev

| Package | Purpose |
|---------|---------|
| `vitest` ^4.1.5 | Unit test runner |
| `typescript` ^7.0.0 | Type checking (`tsc --noEmit`) |
| `oxlint` ^1.71.0 | Linting (typescript, unicorn, oxc, import, jest plugins) |
| `oxfmt` ^0.59.0 | Code formatting |
| `bumpp` ^11.1.0 | Version bumping (release workflow) |
| `np` ^12.0.0 | npm publish (gated) |
| `@types/node` ^26.0.1 | Node.js type definitions |

## No Runtime Dependencies

The provider has **zero runtime dependencies** beyond the pi platform peer deps. All functionality is implemented using Node.js built-ins:

- `node:fs` (`existsSync`, `readFileSync`) — auth file resolution
- `node:os` (`homedir`) — default auth path resolution
- `node:path` (`join`) — path construction
- Global `fetch` — API calls (model discovery)
- `AbortController` / `AbortSignal.timeout` — request timeouts

## Build

**No build step.** pi loads `.ts` source directly via `tsconfig.json` (`noEmit: true`). The `main` field in `package.json` points to `src/index.ts`.

## Configuration Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript strict mode, ES2022, bundler resolution |
| `vitest.config.ts` | Test include pattern: `tests/**/*.test.ts` |
| `.oxlintrc.json` | Lint rules (disables `consistent-function-scoping` in tests) |
| `.oxfmtrc.json` | Formatter config (empty — all defaults) |
| `package.json` | `pi.extensions: ["./src/index.ts"]` for pi discovery |
| `.npmignore` | Excludes `.git`, `.github`, `.planning`, `node_modules` |
| `prek.toml` | Pre-commit hooks (oxlint + oxfmt) |
