# Stack — pi-qwencloud-provider

## Runtime

| Category | Choice | Version |
|---|---|---|
| Language | TypeScript | 7.0 |
| Runtime | Node.js | ≥22 |
| Module system | ESM (`"type": "module"`) | — |
| Module resolution | bundler | — |
| Compile target | ES2022 | — |

## Dependencies

### Peer (pi runtime — available at extension load time)

| Package | Purpose |
|---|---|
| `@earendil-works/pi-ai` | Provider types (`ExtensionAPI`, `OAuthCredentials`, `Model<Api>`, `OpenAICompletionsCompat`) |
| `@earendil-works/pi-coding-agent` | Extension entry point, slash commands, event hooks |

### Dev

| Package | Purpose | Version |
|---|---|---|
| `typescript` | Type-checking (`tsc --noEmit`) | ^7.0 |
| `vitest` | Unit test runner | ^4.1.5 |
| `oxlint` | Linting (TypeScript, unicorn, import, jest plugins) | ^1.71 |
| `oxfmt` | Formatting (in-place + `--check` in CI) | ^0.59 |
| `bumpp` | Version bump + commit + tag + push | ^11.1 |
| `np` | npm publish gating (branch check, test script, release draft) | ^12.0 |
| `@types/node` | Node.js type stubs | ^26.0 |

### Runtime (production — bundled via src/)

| Package | Purpose |
|---|---|
| `pi-qwencloud-provider` | Self-reference (npm package metadata) |

No external runtime dependencies beyond Node.js stdlib (`node:fs`, `node:os`, `node:path`, `node:fs/promises`).

## Configuration

| File | Purpose |
|---|---|
| `tsconfig.json` | `strict: true`, `noEmit: true`, `moduleResolution: "bundler"`. pi loads `.ts` source directly. |
| `vitest.config.ts` | Includes `tests/**/*.test.ts` |
| `.oxlintrc.json` | Disables `unicorn/consistent-function-scoping` in test files |
| `.oxfmtrc.json` | Formatter config |
| `prek.toml` | Pre-commit hooks (oxlint + oxfmt --check) |
| `package.json` | `"pi": { "extensions": ["./src/index.ts"] }` — pi extension entry point |
| `renovate.json` | Dependency update automation |

## API Surface

The provider exposes a single `openai-completions` API stream via pi's built-in SSE handling. No custom streaming protocol — all SSE parsing, tool calls, and usage tracking are handled by pi's `openai-completions` implementation.

The Wan image generation feature uses a separate synchronous REST endpoint (not chat/completions) — called via a pi slash command (`/wan`), not through the provider's streaming pipeline.
