import { describe, it, expect, vi } from "vitest";
import type { OAuthCredentials, OAuthLoginCallbacks } from "@earendil-works/pi-ai";
import { login, refreshToken, getApiKey, sanitizeApiKey } from "../../src/oauth.js";

function makeCallbacks(overrides?: {
  onAuth?: (params: { url: string }) => void;
  onPrompt?: (params: { message: string }) => Promise<string>;
}): OAuthLoginCallbacks {
  return {
    onAuth: overrides?.onAuth ?? vi.fn(),
    onPrompt: overrides?.onPrompt ?? (async () => ""),
    onDeviceCode: vi.fn(),
  } as unknown as OAuthLoginCallbacks;
}

describe("login", () => {
  it("opens dashboard and prompts for API key", async () => {
    const onAuth = vi.fn();
    const callbacks = makeCallbacks({
      onAuth,
      onPrompt: async () => "qwen_api_key_abcdefghij1234567890",
    });

    const result = await login(callbacks);

    expect(onAuth).toHaveBeenCalledWith({
      url: "https://home.qwencloud.com",
    });
    expect(result.access).toBe("qwen_api_key_abcdefghij1234567890");
    expect(result.refresh).toBe("qwen_api_key_abcdefghij1234567890");
  });

  it("throws on empty API key", async () => {
    const callbacks = makeCallbacks({ onPrompt: async () => "" });
    await expect(login(callbacks)).rejects.toThrow("No QwenCloud API key provided");
  });

  it("trims whitespace from pasted API key", async () => {
    const callbacks = makeCallbacks({
      onPrompt: async () => "  qwen_key_with_spaces_123456  ",
    });

    const result = await login(callbacks);
    expect(result.access).toBe("qwen_key_with_spaces_123456");
  });

  it("warns on unusually short API key (< 20 chars)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const callbacks = makeCallbacks({
      onPrompt: async () => "short_key_123",
    });

    await login(callbacks);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("[qw]");
    expect(warnSpy.mock.calls[0][0]).toContain("unusually short");
    warnSpy.mockRestore();
  });
});

describe("refreshToken", () => {
  it("returns static credentials unchanged (no-op)", async () => {
    const cred: OAuthCredentials = {
      access: "qwen_static_key_123",
      refresh: "qwen_static_key_123",
      expires: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
    };

    const result = await refreshToken(cred);

    // Access and refresh are the same (static key)
    expect(result.access).toBe("qwen_static_key_123");
    expect(result.refresh).toBe("qwen_static_key_123");
    expect(result.expires).toBeGreaterThan(Date.now());
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

  it("removes DEL character", () => {
    expect(sanitizeApiKey("test_\x7Fkey")).toBe("test_key");
  });

  it("handles bracket-only paste wrappers (no escape)", () => {
    expect(sanitizeApiKey("[200~test_key[201~")).toBe("test_key");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(sanitizeApiKey("   \t\n  ")).toBe("");
  });
});

describe("getApiKey", () => {
  it("returns the access token from credentials", () => {
    const cred: OAuthCredentials = {
      access: "qwen_api_key_abc",
      refresh: "qwen_api_key_abc",
      expires: Date.now() + 3600000,
    };
    expect(getApiKey(cred)).toBe("qwen_api_key_abc");
  });
});
