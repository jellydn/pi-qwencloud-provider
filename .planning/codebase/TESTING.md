# Testing — pi-qwencloud-provider

## Framework

| Item | Choice |
|---|---|
| Runner | Vitest 4.x |
| Config | `vitest.config.ts` — includes `tests/**/*.test.ts` |
| Watch | `npm run test:watch` |
| CI | `npm test` in GitHub Actions |

## Structure

1:1 module-to-test mapping under `tests/unit/`:

| Source Module | Test File | Test Count |
|---|---|---|
| `index.ts` | `index.test.ts` | 6 |
| `env.ts` | `env.test.ts` | 8 |
| `auth.ts` | `auth.test.ts` | 8 |
| `models.ts` (barrel → catalog + discovery + thinking) | `models.test.ts` | ~20 |
| `oauth.ts` | `oauth.test.ts` | 10 |
| `error-handler.ts` | `error-handler.test.ts` | — |
| `errors.ts` | `errors.test.ts` | — |
| `wan.ts` | `wan.test.ts` | 12 |
| `utils.ts` | `utils.test.ts` | — |
| **Type contract** | `tests/type/contract.ts` | Compile-time |
| **E2E curl** | `tests/e2e/smoke.sh` | — |
| **E2E pi** | `tests/e2e/smoke-pi.sh` | 5 (4 chat + 1 vision) |

Total: **97 unit tests** across 9 test files.

## Mocking Strategy

### Dependency injection (no mocking library for I/O)

Tests pass injectable stubs through the options pattern:

```typescript
// auth.test.ts — injectable readFile + fileExists
const readFile = () => JSON.stringify({ apiKey: "qw_from_file" });
const fileExists = () => true;
expect(resolveApiKey(undefined, { readFile, fileExists })).toBe("qw_from_file");
```

### vi.mock for auth in wan tests

`wan.test.ts` mocks the entire auth module to prevent env API keys from leaking into tests:

```typescript
vi.mock("../../src/auth.js", () => ({
  resolveApiKey: vi.fn().mockReturnValue(undefined),
}));
```

### vi.stubGlobal for fetch

```typescript
vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("...")));
```

### vi.stubEnv for environment variables

```typescript
vi.stubEnv("QWENCLOUD_API_KEY", "test-key-123");
```

### vi.spyOn for console

```typescript
const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
```

## E2E Tests

### Curl smoke (`tests/e2e/smoke.sh`)

Tests the QwenCloud API directly (no pi). Requires `CLINE_API_KEY` env var.

### pi E2E (`tests/e2e/smoke-pi.sh`)

Tests 5 scenarios:
1. Basic chat (`qw/qwen3.6-flash`) — simple response
2. Reasoning (`qw/qwen3.7-plus`) — math question
3. DeepSeek (`qw/deepseek-v4-pro`) — response
4. GLM (`qw/glm-5.2`) — response
5. **Vision** (`qw/qwen3.7-plus`) — describes a generated 50×50 red PNG

Requires `QWENCLOUD_API_KEY` + `pi` CLI. Vision test uses `tests/e2e/create-test-image.py` to generate the test image (Python stdlib only, no PIL).

### Type contract (`tests/type/contract.ts`)

Compile-time verification that the default export conforms to `ExtensionAPI`. If pi changes the interface, this fails at typecheck time.

## Coverage Notes

- Every exported function has at least one unit test
- `resolveApiKey` chain tested: explicit key → env var → auth.json (apiKey field) → auth.json (qw string) → auth.json (qw OAuth object) → undefined → malformed JSON → env vs file priority
- `generateWanImage` tested: no key, bad model, bad size, bad n, API error (401), network error, success, custom options, no image URL
- `downloadWanImage` tested: success (with cleanup), download failure (404)
- `login` tested: normal flow, empty key, whitespace trim, short key warning
- `fetchRemoteModels` tested through `resolveModels` fallback (remote unavailable → static catalog)
