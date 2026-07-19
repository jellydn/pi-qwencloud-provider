# Structure — pi-qwencloud-provider

## Directory Layout

```
pi-qwencloud-provider/
├── src/                        # Source modules (pi loads .ts directly)
│   ├── index.ts                # Entry point — pi.registerProvider("qw", ...) + /wan command
│   ├── env.ts                  # Constants (DEFAULT_API_BASE, ENV_API_KEY, PROVIDER_NAME) + resolveApiBase
│   ├── auth.ts                 # API key resolution (env → ~/.pi/agent/auth.json)
│   ├── models.ts               # Barrel re-export (thinking + catalog + discovery)
│   ├── thinking.ts             # Reasoning-effort maps + reasoningEffortFor() interface
│   ├── catalog.ts              # Static model data (11 models) + compat flags + filtering
│   ├── discovery.ts            # Dynamic model fetch (/models endpoint, 5s timeout)
│   ├── oauth.ts                # /login flow + sanitizeApiKey + static credential helpers
│   ├── error-handler.ts        # message_end event handler (filter → classify → deliver)
│   ├── errors.ts               # Error classification logic (pure functions)
│   ├── wan.ts                  # Wan image generation (API call + download + save)
│   └── utils.ts                # Type guards (isRecord, stringValue, numberValue, booleanValue)
│
├── tests/
│   ├── unit/                   # 1:1 module mapping
│   │   ├── index.test.ts       # Provider registration + message_end event
│   │   ├── env.test.ts         # Constants + resolveApiBase
│   │   ├── auth.test.ts        # resolveApiKey (8 tests)
│   │   ├── models.test.ts      # Static catalog + fetchRemoteModels + resolveModels
│   │   ├── oauth.test.ts       # Login flow + refreshToken + getApiKey + sanitizeApiKey
│   │   ├── error-handler.test.ts
│   │   ├── errors.test.ts      # classifyQwenCloudError
│   │   ├── wan.test.ts         # generateWanImage + downloadWanImage (12 tests)
│   │   └── utils.test.ts       # Type guard validation
│   ├── type/
│   │   └── contract.ts         # Compile-time check: default export conforms to ExtensionAPI
│   └── e2e/
│       ├── smoke.sh            # Curl-based smoke (QwenCloud API directly)
│       ├── smoke-pi.sh         # pi-based E2E (4 chat models + 1 vision test)
│       └── create-test-image.py # Helper: generates 50×50 red PNG for vision test
│
├── .planning/
│   └── codebase/               # This codemap (7 docs)
│
├── .github/workflows/ci.yml    # CI: typecheck + test + lint
├── package.json                # pi extension metadata + npm scripts
├── tsconfig.json               # strict, noEmit, bundler resolution
├── vitest.config.ts            # Test includes
├── .oxlintrc.json              # Lint config (disables function-scoping in tests)
├── .oxfmtrc.json               # Format config
├── prek.toml                   # Pre-commit hooks
├── renovate.json               # Dep update automation
├── CHANGELOG.md                # Release history (v0.1.0 → v0.1.3)
├── README.md                   # User-facing docs
└── AGENTS.md                   # Agent guide for AI coding tools
```

## Key Locations

| What | Where |
|---|---|
| Extension entry point | `src/index.ts` — default export receiving `ExtensionAPI` |
| Provider name | `src/env.ts` — `PROVIDER_NAME = "qw"` |
| Model catalog | `src/catalog.ts` — `MODELS` array (11 models) |
| Reasoning maps | `src/thinking.ts` — 4 maps + `reasoningEffortFor()` |
| Dynamic discovery | `src/discovery.ts` — `fetchRemoteModels()` + `resolveModels()` |
| API key resolution | `src/auth.ts` — `resolveApiKey()` |
| Login flow | `src/oauth.ts` — `login()`, `refreshToken()`, `getApiKey()` |
| Error classification | `src/errors.ts` — `classifyQwenCloudError()` |
| Error delivery | `src/error-handler.ts` — `handleQwenCloudError()` |
| Wan image generation | `src/wan.ts` — `generateAndDownloadWanImage()` |
| Type contract | `tests/type/contract.ts` — compile-time `ExtensionAPI` compliance |

## Module Size

| Module | Lines | Concern |
|---|---|---|
| `catalog.ts` | ~210 | Static data (largest data file) |
| `discovery.ts` | ~130 | Fetch + parse |
| `wan.ts` | ~150 | Image generation |
| `auth.ts` | ~80 | Key resolution |
| `oauth.ts` | ~95 | Login flow |
| `thinking.ts` | ~65 | Reasoning maps |
| `index.ts` | ~130 | Entry + Wan command |
| `env.ts` | ~25 | Config |
| `error-handler.ts` | ~35 | Event handler |
| `errors.ts` | ~55 | Classification |
| `utils.ts` | ~20 | Type guards |
| `models.ts` | ~30 | Barrel |
