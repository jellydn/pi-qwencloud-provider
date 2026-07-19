# Concerns — pi-qwencloud-provider

## Resolved (post-architecture refactor)

### ~~models.ts hot spot (445 lines, 5 jobs)~~
**Fixed:** Split into `thinking.ts` (reasoning maps), `catalog.ts` (data), `discovery.ts` (I/O). Data edits now touch only catalog.ts (~210 lines). Compat-merge and map-selection rules stated once.

### ~~walkAuthPaths hypothetical seam~~
**Fixed:** Generic `<T>/extract` seam removed; walk logic inlined into `resolveApiKey`. Injectable handles preserved.

### ~~env.ts junk drawer~~
**Fixed:** `sanitizeApiKey` moved to `oauth.ts` (only caller). Dead `buildEndpointUrl` + `DEFAULT_ENDPOINT` deleted. env.ts is now config constants + `resolveApiBase` only.

## Remaining

### 1. Wan endpoint URL construction is fragile

**Severity:** Low | **File:** `src/wan.ts`

The Wan endpoint URL is derived from the chat completions base by regex-replacing `/compatible-mode/v1` with the Wan path. If a user sets `QWENCLOUD_API_BASE` to a custom proxy URL that doesn't follow the same path convention, the generated Wan URL will be incorrect. A more robust approach would use a separate env var (`QWENCLOUD_WAN_BASE`) or parse the host deterministically.

### 2. `reasoningEffortFor` is unused internally

**Severity:** Low (code slop) | **File:** `src/thinking.ts`

The `reasoningEffortFor(map, level)` function is exported but never called within the provider. It exists as a public utility for external consumers of the barrel, but the architecture review's intent was to use it as the single translation interface internally. The catalog assigns maps by reference; discovery selects maps with a ternary. The function is essentially dead code within the provider.

### 3. No test-split along the module seam

**Severity:** Low | **File:** `tests/unit/models.test.ts`

The architecture review recommended splitting the test file along the catalog/discovery seam. Currently `models.test.ts` still imports from the barrel (`../../src/models.js`) and tests both concerns through the same file. A `catalog.test.ts` + `discovery.test.ts` split would improve locality and make data-only changes faster to validate.

### 4. `defaultAuthPaths` is still exported but weakly tested

**Severity:** Low | **File:** `src/auth.ts`

After collapsing `walkAuthPaths`, `defaultAuthPaths` is still exported as a public API. It was previously tested in `auth.test.ts` but that test was removed during the refactor. The function is simple (one-line array) but untested.

### 5. HappyHorse video generation not implemented

**File:** `src/catalog.ts` (models in catalog, no generation module)

The HappyHorse models (`happyhorse-1.1-i2v/t2v/r2v`) are in the catalog for discovery but have no generation module equivalent to `wan.ts`. HappyHorse uses an async task pattern (submit → poll → download) which is more complex than Wan's synchronous endpoint. Follows the same API path convention as Wan but with different endpoint and polling requirements.

### 6. No vision test for qwen3.8-max-preview and qwen3.6-flash

**Severity:** Low | **File:** `tests/e2e/smoke-pi.sh`

The vision E2E test only covers `qwen3.7-plus`. Both `qwen3.8-max-preview` and `qwen3.6-flash` also support visual understanding per official docs, but this hasn't been verified in the E2E pipeline.

### 7. `pi-qwencloud-provider` self-dependency in package.json

**Severity:** Low | **File:** `package.json`

The `dependencies` field contains `"pi-qwencloud-provider": "^0.1.2"` — a self-reference. This is likely a leftover from initial scaffolding and should be removed.
