# Concerns — pi-qwencloud-provider

## Resolved (post-architecture refactor)

### ~~models.ts hot spot (445 lines, 5 jobs)~~
**Fixed:** Split into `thinking.ts` (reasoning maps), `catalog.ts` (data), `discovery.ts` (I/O). Data edits now touch only catalog.ts (~210 lines). Compat-merge and map-selection rules stated once.

### ~~walkAuthPaths hypothetical seam~~
**Fixed:** Generic `<T>/extract` seam removed; walk logic inlined into `resolveApiKey`. Injectable handles preserved.

### ~~env.ts junk drawer~~
**Fixed:** `sanitizeApiKey` moved to `oauth.ts` (only caller). Dead `buildEndpointUrl` + `DEFAULT_ENDPOINT` deleted. env.ts is now config constants + `resolveApiBase` only.

### ~~CONTROL_CHARS_RE readability (CodeRabbit nitpick)~~
**Fixed:** Simplified from `new RegExp(String.fromCharCode(...), "g")` template-literal construction to a clean `/[\x00-\x1F\x7F]/g` regex literal. Same behaviour, better readability.

### ~~Self-dependency in package.json~~
**Fixed:** Removed `"pi-qwencloud-provider": "^0.1.2"` from `dependencies` — a leftover scaffold artefact.

### ~~defaultAuthPaths untested~~
**Fixed:** Added a unit test verifying `defaultAuthPaths("/home/test")` returns `["/home/test/.pi/agent/auth.json"]`.

### ~~Test file not split along module seam~~
**Fixed:** `models.test.ts` (289 lines) split into `catalog.test.ts` (10 tests, imports catalog + thinking directly), `discovery.test.ts` (10 tests, imports discovery + catalog), and `models.test.ts` (4 barrel integration tests). 101 tests across 11 files.

### ~~thinkingMapFor not wired into discovery (spec gap)~~
**Fixed:** `parseRemoteModel` now calls `thinkingMapFor(reasoning, fallback?.thinkingLevelMap)` instead of the inline ternary. Import slimmed from two constants to one function.

### ~~Non-chat models missing from remote results~~
**Fixed:** `resolveModels` appends static non-chat models (Wan, HappyHorse) to remote results so they're consistently available regardless of fetch success.

### ~~Section rulers missing in thinking.ts~~
**Fixed:** Added three section rulers (Types, Translation Functions, Thinking Level Maps) matching the rest of the codebase.

## Remaining

### 1. Wan endpoint URL construction is fragile

**Severity:** Low | **File:** `src/wan.ts`

The Wan endpoint URL is derived from the chat completions base by regex-replacing `/compatible-mode/v1` with the Wan path. If a user sets `QWENCLOUD_API_BASE` to a custom proxy URL that doesn't follow the same path convention, the generated Wan URL will be incorrect. A more robust approach would use a separate env var (`QWENCLOUD_WAN_BASE`) or parse the host deterministically.

### 2. `reasoningEffortFor` is unused internally

**Severity:** Low (code slop) | **File:** `src/thinking.ts`

The `reasoningEffortFor(map, level)` function is exported but never called within the provider. It exists as a public utility for external consumers. The `thinkingMapFor` function now handles map selection in discovery; `reasoningEffortFor` is the level-translation counterpart for external callers.

### 3. HappyHorse video generation not implemented

**File:** `src/catalog.ts` (models in catalog, no generation module)

The HappyHorse models (`happyhorse-1.1-i2v/t2v/r2v`) are in the catalog for discovery but have no generation module equivalent to `wan.ts`. HappyHorse uses an async task pattern (submit → poll → download) which is more complex than Wan's synchronous endpoint.

### 4. No vision test for qwen3.8-max-preview and qwen3.6-flash

**Severity:** Low | **File:** `tests/e2e/smoke-pi.sh`

The vision E2E test only covers `qwen3.7-plus`. Both `qwen3.8-max-preview` and `qwen3.6-flash` also support visual understanding per official docs, but this hasn't been verified in the E2E pipeline.
