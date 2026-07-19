import { describe, it, expect } from "vitest";
import {
  modelIds,
  MODELS,
  QWENCLOUD_OPENAI_COMPAT,
  fetchRemoteModels,
  resolveModels,
} from "../../src/models.js";

/**
 * Barrel integration test — verifies the models.ts barrel re-exports
 * correctly from catalog.ts, discovery.ts, and thinking.ts.
 * Full unit coverage lives in catalog.test.ts and discovery.test.ts.
 */

describe("models barrel", () => {
  it("re-exports MODELS from catalog", () => {
    expect(Array.isArray(MODELS)).toBe(true);
    expect(MODELS.length).toBeGreaterThanOrEqual(6);
  });

  it("re-exports modelIds from catalog", () => {
    const ids = modelIds();
    expect(ids).toHaveLength(MODELS.length);
  });

  it("re-exports QWENCLOUD_OPENAI_COMPAT from catalog", () => {
    expect(QWENCLOUD_OPENAI_COMPAT.supportsDeveloperRole).toBe(false);
  });

  it("re-exports fetchRemoteModels and resolveModels from discovery", () => {
    expect(typeof fetchRemoteModels).toBe("function");
    expect(typeof resolveModels).toBe("function");
  });
});
