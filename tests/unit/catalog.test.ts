import { describe, it, expect } from "vitest";
import { modelIds, MODELS, QWENCLOUD_OPENAI_COMPAT } from "../../src/catalog.js";
import { DEFAULT_THINKING_LEVEL_MAP } from "../../src/thinking.js";

describe("modelIds", () => {
  it("returns all model IDs", () => {
    const ids = modelIds();
    expect(ids).toHaveLength(MODELS.length);
    expect(ids).toContain("qwen3.7-plus");
    expect(ids).toContain("deepseek-v4-pro");
    expect(ids).toContain("glm-5.2");
  });

  it("model IDs do not include provider prefix", () => {
    for (const id of modelIds()) {
      expect(id.startsWith("qwencloud/")).toBe(false);
    }
  });
});

describe("MODELS", () => {
  it("has at least the text chat models", () => {
    expect(MODELS.length).toBeGreaterThanOrEqual(6);
  });

  it("text chat models have valid cost and context fields", () => {
    const textModels = MODELS.filter((m) => m.contextWindow > 0 && m.maxTokens > 0);
    for (const m of textModels) {
      expect(m.cost.input).toBeGreaterThanOrEqual(0);
      expect(m.cost.output).toBeGreaterThanOrEqual(0);
      expect(m.contextWindow).toBeGreaterThan(0);
      expect(m.maxTokens).toBeGreaterThan(0);
      expect(
        m.input[0] === "text" &&
          (m.input.length === 1 || (m.input.length === 2 && m.input[1] === "image")),
      ).toBe(true);
    }
  });

  it("every model declares all six thinking levels", () => {
    const validLevels = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;
    for (const m of MODELS) {
      const map = m.thinkingLevelMap;
      for (const level of validLevels) {
        expect(map).toHaveProperty(level);
        const value = map[level];
        expect(value === null || typeof value === "string").toBe(true);
      }
    }
  });

  it("DEFAULT_THINKING_LEVEL_MAP supports off=none, low/medium/high", () => {
    expect(DEFAULT_THINKING_LEVEL_MAP.off).toBe("none");
    expect(DEFAULT_THINKING_LEVEL_MAP.low).toBe("low");
    expect(DEFAULT_THINKING_LEVEL_MAP.medium).toBe("medium");
    expect(DEFAULT_THINKING_LEVEL_MAP.high).toBe("high");
  });

  it("GLM-5.2 supports off=none, low/medium/high/xhigh", () => {
    const model = MODELS.find((m) => m.id === "glm-5.2")!;
    const map = model.thinkingLevelMap;
    expect(map.off).toBe("none");
    expect(map.low).toBe("low");
    expect(map.medium).toBe("medium");
    expect(map.high).toBe("high");
    expect(map.xhigh).toBe("xhigh");
  });

  it("DeepSeek V4 Pro supports off=none, high/xhigh=max", () => {
    const model = MODELS.find((m) => m.id === "deepseek-v4-pro")!;
    const map = model.thinkingLevelMap;
    expect(map.off).toBe("none");
    expect(map.low).toBeNull();
    expect(map.medium).toBeNull();
    expect(map.high).toBe("high");
    expect(map.xhigh).toBe("max");
  });

  it("qwen3.6-flash supports reasoning with default map", () => {
    const model = MODELS.find((m) => m.id === "qwen3.6-flash")!;
    expect(model.reasoning).toBe(true);
    expect(model.thinkingLevelMap).toEqual(DEFAULT_THINKING_LEVEL_MAP);
  });

  it("Wan and HappyHorse models have reasoning: false and placeholder tokens", () => {
    const genModels = MODELS.filter((m) => m.id.startsWith("wan") || m.id.startsWith("happyhorse"));
    for (const m of genModels) {
      expect(m.reasoning).toBe(false);
      expect(m.contextWindow).toBeGreaterThan(0);
      expect(m.maxTokens).toBeGreaterThan(0);
      expect(m.contextWindow).toBe(8_192);
      expect(m.maxTokens).toBe(4_096);
    }
  });

  it("declares supportsDeveloperRole: false for all models", () => {
    for (const model of MODELS) {
      expect(model.compat).toEqual(QWENCLOUD_OPENAI_COMPAT);
      expect(model.compat.supportsDeveloperRole).toBe(false);
    }
  });
});
