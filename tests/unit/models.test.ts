import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  modelIds,
  MODELS,
  QWENCLOUD_OPENAI_COMPAT,
  DEFAULT_THINKING_LEVEL_MAP,
  NO_THINKING_MAP,
  fetchRemoteModels,
  resolveModels,
} from "../../src/models.js";

describe("modelIds", () => {
  it("returns all model IDs", () => {
    const ids = modelIds();
    expect(ids).toHaveLength(MODELS.length);
    expect(ids).toContain("qwencloud/qwen3.7-plus");
    expect(ids).toContain("qwencloud/deepseek-v4-pro");
    expect(ids).toContain("qwencloud/glm-5.2");
  });

  it("all text model IDs start with qwencloud/", () => {
    for (const id of modelIds()) {
      expect(id.startsWith("qwencloud/")).toBe(true);
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
      expect(m.input).toEqual(["text"]);
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
    const model = MODELS.find((m) => m.id === "qwencloud/glm-5.2")!;
    const map = model.thinkingLevelMap;
    expect(map.off).toBe("none");
    expect(map.low).toBe("low");
    expect(map.medium).toBe("medium");
    expect(map.high).toBe("high");
    expect(map.xhigh).toBe("xhigh");
  });

  it("DeepSeek V4 Pro supports off=none, high/xhigh=max", () => {
    const model = MODELS.find((m) => m.id === "qwencloud/deepseek-v4-pro")!;
    const map = model.thinkingLevelMap;
    expect(map.off).toBe("none");
    expect(map.low).toBeNull();
    expect(map.medium).toBeNull();
    expect(map.high).toBe("high");
    expect(map.xhigh).toBe("max");
  });

  it("qwen3.6-flash supports reasoning with default map", () => {
    const model = MODELS.find((m) => m.id === "qwencloud/qwen3.6-flash")!;
    expect(model.reasoning).toBe(true);
    expect(model.thinkingLevelMap).toEqual(DEFAULT_THINKING_LEVEL_MAP);
  });

  it("Wan and HappyHorse models have reasoning: false and placeholder tokens", () => {
    const genModels = MODELS.filter(
      (m) => m.id.startsWith("qwencloud/wan") || m.id.startsWith("qwencloud/happyhorse"),
    );
    for (const m of genModels) {
      expect(m.reasoning).toBe(false);
      expect(m.contextWindow).toBeGreaterThan(0);
      expect(m.maxTokens).toBeGreaterThan(0);
      expect(m.contextWindow).toBe(8_192);
      expect(m.maxTokens).toBe(4_096);
    }
  });

  it("declares supportsDeveloperRole: true for all models", () => {
    for (const model of MODELS) {
      expect(model.compat).toEqual(QWENCLOUD_OPENAI_COMPAT);
      expect(model.compat.supportsDeveloperRole).toBe(true);
    }
  });
});

// ─── fetchRemoteModels ─────────────────────────────────────────────────────

describe("fetchRemoteModels", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns undefined when no API key is provided", async () => {
    const result = await fetchRemoteModels({ apiKey: undefined });
    expect(result).toBeUndefined();
  });

  it("returns undefined on non-OK response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("Not Found", { status: 404 }),
    );
    const result = await fetchRemoteModels({ apiKey: "test_key" });
    expect(result).toBeUndefined();
  });

  it("returns undefined on network error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));
    const result = await fetchRemoteModels({ apiKey: "test_key" });
    expect(result).toBeUndefined();
  });

  it("parses OpenAI-compatible { data: [...] } response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "qwencloud/qwen3.7-plus",
              name: "Qwen3.7 Plus",
              context_length: 1_048_576,
              max_output_tokens: 131_072,
              pricing: {
                prompt: "0.0000004",
                completion: "0.0000016",
                cached_input: "0.00000004",
              },
              reasoning: true,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await fetchRemoteModels({ apiKey: "test_key" });
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("qwencloud/qwen3.7-plus");
    expect(result![0].name).toBe("Qwen3.7 Plus");
    expect(result![0].contextWindow).toBe(1_048_576);
    expect(result![0].reasoning).toBe(true);
    expect(result![0].cost.input).toBeCloseTo(0.4, 1);
  });

  it("filters out non-qwencloud models", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: "qwencloud/qwen3.7-plus", name: "Qwen3.7 Plus" },
            { id: "openai/gpt-5", name: "GPT-5" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await fetchRemoteModels({ apiKey: "test_key" });
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("qwencloud/qwen3.7-plus");
  });

  it("filters out non-chat model families (wan, happyhorse)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: "qwencloud/qwen3.7-plus", name: "Qwen3.7 Plus" },
            { id: "qwencloud/wan2.7-image", name: "Wan2.7 Image" },
            { id: "qwencloud/happyhorse-1.1-t2v", name: "HappyHorse" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await fetchRemoteModels({ apiKey: "test_key" });
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("qwencloud/qwen3.7-plus");
  });

  it("uses static model fallback values for missing fields", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "qwencloud/qwen3.7-plus" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await fetchRemoteModels({ apiKey: "test_key" });
    expect(result).toHaveLength(1);
    const staticModel = MODELS.find((m) => m.id === "qwencloud/qwen3.7-plus");
    expect(result![0].contextWindow).toBe(staticModel!.contextWindow);
    expect(result![0].maxTokens).toBe(staticModel!.maxTokens);
    expect(result![0].cost.input).toBe(staticModel!.cost.input);
  });

  it("uses NO_THINKING_MAP when remote model reports reasoning: false", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "qwencloud/non-reasoning-model",
              reasoning: false,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await fetchRemoteModels({ apiKey: "test_key" });
    expect(result).toHaveLength(1);
    expect(result![0].reasoning).toBe(false);
    expect(result![0].thinkingLevelMap).toEqual(NO_THINKING_MAP);
  });
});

// ─── resolveModels ─────────────────────────────────────────────────────────

describe("resolveModels", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to static MODELS when no API key", async () => {
    const result = await resolveModels(undefined);
    expect(result).toEqual(MODELS);
  });

  it("falls back to static MODELS when fetch fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("Not Found", { status: 404 }),
    );
    const result = await resolveModels("test_key");
    expect(result).toEqual(MODELS);
  });

  it("returns remote models when fetch succeeds", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "qwencloud/qwen3.7-plus",
              name: "Qwen3.7 Plus Updated",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await resolveModels("test_key");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("qwencloud/qwen3.7-plus");
    expect(result[0].name).toBe("Qwen3.7 Plus Updated");
  });
});
