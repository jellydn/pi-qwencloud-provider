# Testing — pi-qwencloud-provider

## Framework

| Component | Tool |
|-----------|------|
| Runner | Vitest ^4.1.5 |
| Type checking | `tsc --noEmit` |
| Linting | oxlint |
| E2E | bash + curl (smoke.sh) |

## Structure

### Unit Tests (`tests/unit/`)

1:1 mapping: `src/foo.ts` → `tests/unit/foo.test.ts`

| Test File | Covers | Tests |
|-----------|--------|-------|
| `utils.test.ts` | `isRecord`, `stringValue`, `numberValue`, `booleanValue` | 12 |
| `env.test.ts` | Constants, `resolveApiBase`, `sanitizeApiKey`, `buildEndpointUrl` | 15 |
| `auth.test.ts` | `resolveApiKey` priority chain, `defaultAuthPaths` | 15 |
| `models.test.ts` | `MODELS` catalog, thinking maps, dynamic discovery, `resolveModels` | 21 |
| `errors.test.ts` | `classifyQwenCloudError` (401/403/429/quota/unknown) | 11 |
| `error-handler.test.ts` | `handleQwenCloudError` filter/classify/deliver | 8 |
| `oauth.test.ts` | `login`, `refreshToken`, `getApiKey` | 7 |
| `index.test.ts` | `registerProvider` shape, model forwarding, oauth wiring, event listener | 6 |
| **Total** | | **95** |

### Type Contract (`tests/type/`)

`contract.ts` verifies `default export` conforms to `ExtensionAPI` at compile time.

### E2E (`tests/e2e/`)

`smoke.sh` — 7 scenarios against live API (requires `QWENCLOUD_API_KEY`):
1. GET `/models`
2. Basic chat (qwen3.6-flash)
3. `reasoning_effort=low`
4. `reasoning_effort=high`
5. No `reasoning_effort`
6. `reasoning_effort="none"`
7. deepseek-v4-pro

## Mocking Strategy

### Dependency Injection (no mocking library needed)

All I/O is injectable — tests pass mock functions directly:

```typescript
it("falls back to auth.json with apiKey field", () => {
  const readFile = () => JSON.stringify({ apiKey: "qwen_from_file" });
  const fileExists = () => true;
  expect(resolveApiKey(undefined, { readFile, fileExists })).toBe("qwen_from_file");
});
```

### Global Stubs for fetch

```typescript
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    new Response("Not Found", { status: 404 })
  ));
});
afterEach(() => {
  vi.unstubAllGlobals();
});
```

### Env Stubs

```typescript
vi.stubEnv(ENV_API_KEY, "test-key-123");
```

### No spy/mock on console.warn in auth.corrupt-file test

The `"skips malformed auth.json"` test relies on `walkAuthPaths` catching JSON parse errors and calling `console.warn`. This produces expected warning output during test runs.

## Test Commands

| Command | What it runs |
|---------|-------------|
| `npm test` | `vitest run` — all `tests/**/*.test.ts` |
| `npm run test:watch` | `vitest` — watch mode |
| `npm run test:e2e` | `bash tests/e2e/smoke.sh` (needs `QWENCLOUD_API_KEY`) |
| `npm run typecheck` | `tsc` — compile-time verification |
| `npm run lint` | `oxlint --config .oxlintrc.json src/ tests/` |

## CI

Configuration at `.github/workflows/ci.yml` (standard Node.js CI: install → lint → typecheck → test).

## Coverage

No explicit coverage thresholds configured. The 1:1 test-to-module mapping ensures comprehensive coverage of the 8 source modules.
