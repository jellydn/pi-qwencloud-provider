# AGENTS.md — pi-qwencloud-provider

A pi (pi-coding-agent) extension that registers QwenCloud as a model provider.
It is a single-package TypeScript library, not an app — there is no build step;
`src/` is the published entrypoint (`main`/`types` point at `src/index.ts`).

## Commands

- `npm test` — run unit tests (vitest). Tests live in `tests/unit/*.test.ts`;
  config only includes `tests/**/*.test.ts`.
- `npm run lint` — `oxlint` over `src/` and `tests/` (uses `.oxlintrc.json`).
- `npm run format` / `npm run format:check` — `oxfmt` (empty `.oxfmtrc.json`).
- `npm run typecheck` — `tsc` with `noEmit: true`. `tsconfig` has `strict` on.
- Releases: `npm run release:`_`patch|minor|major`_ (bumpp, commits + tags + pushes
  to `main`). `npm run pub` publishes to npm. `np` is configured for the `main`
  branch but bumpp is the invoked script.

No codegen, no migrations, no bundler/dist output required for local work
(`dist/` is gitignored but unused by the test/lint flow).

## Architecture

- Entrypoint: `src/index.ts` default-exports an async pi `ExtensionAPI` function.
  It registers the provider via `pi.registerProvider("qwencloud", …)`, wiring
  `api: "openai-completions"` (QwenCloud is OpenAI-compatible) and attaching an
  error handler on `message_end`.
- API key resolution order (`src/auth.ts` `resolveApiKey`): explicit arg →
  `QWENCLOUD_API_KEY` env var → `~/.pi/agent/auth.json`
  (`{ apiKey }` / `{ qwencloud }` / `{ qwencloud: { access } }`).
- `src/oauth.ts`: despite the name, QwenCloud uses **static API keys, not OAuth**.
  `login` opens a dashboard and prompts for the key; `refreshToken` is a no-op.
- Models: `src/models.ts` has a static `MODELS` catalog and `resolveModels`, which
  tries a live `/models` fetch (5s timeout, OpenAI format) and falls back to the
  static list on any error. Image/video models (Wan, HappyHorse) are catalog-only;
  they are not wired to chat/completions.
- Provider name is `qwencloud`; models are referenced as `qwencloud/<slug>`.
- Env overrides: `QWENCLOUD_API_BASE` (default
  `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`),
  `QWENCLOUD_API_KEY`.

## Conventions & gotchas

- ESM only (`"type": "module"`); imports use explicit `.js` extensions
  (e.g. `./env.js`) — required by `moduleResolution: "bundler"`.
- `ModelConfig.input` is a readonly tuple; `index.ts` spreads it to a mutable
  array before registration (`input: [...model.input]`).
- Tests inject I/O (fetch, fs, env) rather than hitting the real network/filesystem.
- **`npm run test:e2e` is broken**: it calls `tests/e2e/smoke.sh`, which does not
  exist in the repo. Don't rely on it; file an issue or add the script.

## Toolchain

- Node >= 22 (`engines`).
- Lint plugins: `typescript`, `unicorn`, `oxc`, `import`, `jest`.
  `unicorn/consistent-function-scoping` is intentionally off (incl. tests).
- Dev deps come from `@earendil-works/pi-ai` and `@earendil-works/pi-coding-agent`
  (peer deps too) — keep those versions in sync when bumping.
