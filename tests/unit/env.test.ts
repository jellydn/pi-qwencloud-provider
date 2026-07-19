import { describe, it, expect } from "vitest";
import {
  DEFAULT_API_BASE,
  DEFAULT_ENDPOINT,
  ENV_API_KEY,
  PROVIDER_NAME,
  resolveApiBase,
  sanitizeApiKey,
  buildEndpointUrl,
} from "../../src/env.js";

describe("constants", () => {
  it("exports correct provider name", () => {
    expect(PROVIDER_NAME).toBe("qwencloud");
  });

  it("exports correct env var name", () => {
    expect(ENV_API_KEY).toBe("QWENCLOUD_API_KEY");
  });

  it("exports correct default API base", () => {
    expect(DEFAULT_API_BASE).toBe(
      "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    );
  });

  it("exports correct endpoint path", () => {
    expect(DEFAULT_ENDPOINT).toBe("/chat/completions");
  });
});

describe("resolveApiBase", () => {
  it("returns default when env not set", () => {
    expect(resolveApiBase({})).toBe(DEFAULT_API_BASE);
  });

  it("returns override from QWENCLOUD_API_BASE", () => {
    expect(
      resolveApiBase({
        QWENCLOUD_API_BASE: "https://custom.example.com/v1",
      }),
    ).toBe("https://custom.example.com/v1");
  });

  it("removes trailing slashes from override", () => {
    expect(
      resolveApiBase({
        QWENCLOUD_API_BASE: "https://api.example.com/v1/",
      }),
    ).toBe("https://api.example.com/v1");
  });

  it("trims whitespace from override", () => {
    expect(
      resolveApiBase({
        QWENCLOUD_API_BASE: "  https://api.example.com/v1  ",
      }),
    ).toBe("https://api.example.com/v1");
  });

  it("falls back to default when QWENCLOUD_API_BASE is empty string", () => {
    expect(resolveApiBase({ QWENCLOUD_API_BASE: "" })).toBe(DEFAULT_API_BASE);
  });
});

describe("sanitizeApiKey", () => {
  it("trims whitespace", () => {
    expect(sanitizeApiKey("  test_key  ")).toBe("test_key");
  });

  it("removes terminal paste wrappers", () => {
    const esc = String.fromCharCode(27);
    expect(sanitizeApiKey(`${esc}[200~test_key${esc}[201~`)).toBe("test_key");
  });

  it("removes control characters", () => {
    expect(sanitizeApiKey("test_\x00key")).toBe("test_key");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(sanitizeApiKey("   \t\n  ")).toBe("");
  });
});

describe("buildEndpointUrl", () => {
  it("builds the full chat completions URL", () => {
    expect(buildEndpointUrl(DEFAULT_API_BASE)).toBe(
      "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions",
    );
  });
});
