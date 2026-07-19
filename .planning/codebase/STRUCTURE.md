# Structure — pi-qwencloud-provider

## Directory Layout

```
pi-qwencloud-provider/
├── src/
│   ├── index.ts           # Entry point — pi extension registration
│   ├── env.ts             # Constants, API base, key sanitization
│   ├── auth.ts            # API key resolution chain
│   ├── models.ts          # Static catalog + dynamic discovery
│   ├── oauth.ts           # Login flow (API key paste)
│   ├── errors.ts          # Error classification
│   ├── error-handler.ts   # message_end event handler
│   └── utils.ts           # Type guards (isRecord, stringValue, etc.)
├── tests/
│   ├── unit/
│   │   ├── index.test.ts         # Provider registration + event wiring
│   │   ├── env.test.ts           # Constants, resolveApiBase, sanitizeApiKey
│   │   ├── auth.test.ts          # API key resolution
│   │   ├── models.test.ts        # Model catalog + dynamic discovery
│   │   ├── oauth.test.ts         # Login, refreshToken, getApiKey
│   │   ├── errors.test.ts        # Error classification
│   │   ├── error-handler.test.ts # Event handling
│   │   └── utils.test.ts         # Type guard tests
│   ├── type/
│   │   └── contract.ts           # Compile-time ExtensionAPI contract
│   └── e2e/
│       └── smoke.sh             # Live API smoke test (7 scenarios)
├── .planning/
│   ├── codebase/                 # Codebase map (this file set)
│   └── implement-notes.md        # Architecture decisions + smoke test results
├── package.json                  # pi extension metadata + scripts
├── tsconfig.json                 # TypeScript strict, ES2022, noEmit
├── vitest.config.ts              # Test include pattern
├── .oxlintrc.json                # Lint rules
├── .oxfmtrc.json                 # Formatter config
├── .gitignore
├── .npmignore
└── README.md                     # Setup instructions + model table
```

## File Line Counts

| File | Lines | Purpose |
|------|-------|---------|
| `src/models.ts` | 414 | Largest file — 11 model defs + fetch/parse logic |
| `tests/unit/models.test.ts` | 267 | Model tests + fetch tests |
| `tests/unit/index.test.ts` | 152 | Provider registration tests |
| `src/index.ts` | 76 | Entry point — minimal wiring |
| `tests/unit/oauth.test.ts` | 153 | Login flow tests |
| `src/auth.ts` | 99 | Key resolution + file walking |
| `tests/unit/auth.test.ts` | 140 | Auth resolution tests |
| `src/errors.ts` | 95 | Error classification + messages |
| `tests/unit/errors.test.ts` | 82 | Classification tests |
| `src/env.ts` | 78 | Constants + URL builders |
| `tests/unit/error-handler.test.ts` | 131 | Event handler tests |
| `src/error-handler.ts` | 57 | message_end handler |
| `src/oauth.ts` | 87 | Login flow |
| `src/utils.ts` | 32 | Type guards |
| `tests/unit/env.test.ts` | 88 | Env tests |
| `tests/unit/utils.test.ts` | 64 | Utility tests |
| `tests/type/contract.ts` | 15 | Type contract |
| **Total** | **1,834** | |

## Naming Conventions

| Convention | Example |
|-----------|---------|
| **Modules** | `@module qwencloud-auth` JSDoc tag on every module |
| **Providers** | `PROVIDER_NAME = "qwencloud"` |
| **Env vars** | `QWENCLOUD_API_KEY`, `QWENCLOUD_API_BASE` |
| **Model IDs** | `qwencloud/qwen3.7-plus` (prefix/slug format) |
| **Exports** | camelCase functions, UPPER_CASE constants |
| **Tests** | 1:1 mapping `src/foo.ts` → `tests/unit/foo.test.ts` |
| **Test describes** | Match export name: `describe("resolveApiKey", ...)` |

## Key Locations

| What | Where |
|------|-------|
| Provider registration | `src/index.ts` — `pi.registerProvider("qwencloud", ...)` |
| API base override | `src/env.ts` — `resolveApiBase(env)` reads `QWENCLOUD_API_BASE` |
| Model definitions | `src/models.ts` — `MODELS` array (11 models) |
| Thinking level mappings | `src/models.ts` — `DEFAULT_THINKING_LEVEL_MAP`, `DEEPSEEK_V4_THINKING_MAP`, `GLM_52_THINKING_MAP` |
| Auth file paths | `src/auth.ts` — `defaultAuthPaths(home)` |
| Login dashboard URL | `src/oauth.ts` — `DASHBOARD_URL = "https://home.qwencloud.com"` |
| Error messages | `src/errors.ts` — `QWENCLOUD_ERROR_MESSAGES` |
| Model discovery endpoint | `src/models.ts` — `MODELS_ENDPOINT = "/models"` |
