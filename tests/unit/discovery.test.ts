import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MODELS } from "../../src/catalog.js";
import { NO_THINKING_MAP } from "../../src/thinking.js";
import { fetchRemoteModels, resolveModels } from "../../src/discovery.js";

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
              id: "qwen3.7-plus",
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
    expect(result![0].id).toBe("qwen3.7-plus");
    expect(result![0].name).toBe("Qwen3.7 Plus");
    expect(result![0].contextWindow).toBe(1_048_576);
    expect(result![0].reasoning).toBe(true);
    expect(result![0].cost.input).toBeCloseTo(0.4, 1);
  });

  it("includes all models except non-chat families", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: "qwen3.7-plus", name: "Qwen3.7 Plus" },
            { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await fetchRemoteModels({ apiKey: "test_key" });
    expect(result).toHaveLength(2);
    expect(result![0].id).toBe("qwen3.7-plus");
    expect(result![1].id).toBe("deepseek-v4-pro");
  });

  it("filters out non-chat model families (wan, happyhorse)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: "qwen3.7-plus", name: "Qwen3.7 Plus" },
            { id: "wan2.7-image", name: "Wan2.7 Image" },
            { id: "happyhorse-1.1-t2v", name: "HappyHorse" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await fetchRemoteModels({ apiKey: "test_key" });
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("qwen3.7-plus");
  });

  it("uses static model fallback values for missing fields", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "qwen3.7-plus" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await fetchRemoteModels({ apiKey: "test_key" });
    expect(result).toHaveLength(1);
    const staticModel = MODELS.find((m) => m.id === "qwen3.7-plus");
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
              id: "non-reasoning-model",
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

  it("returns remote models with static non-chat models appended", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "qwen3.7-plus",
              name: "Qwen3.7 Plus Updated",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await resolveModels("test_key");
    // Non-chat models (wan, happyhorse) appended before remote chat models.
    const chatModels = result.filter(
      (m) => !m.id.startsWith("wan") && !m.id.startsWith("happyhorse"),
    );
    expect(chatModels).toHaveLength(1);
    expect(chatModels[0].id).toBe("qwen3.7-plus");
    expect(chatModels[0].name).toBe("Qwen3.7 Plus Updated");
    // Static non-chat models are included.
    expect(result.some((m) => m.id === "wan2.7-image")).toBe(true);
    expect(result.some((m) => m.id === "happyhorse-1.1-t2v")).toBe(true);
  });
});
