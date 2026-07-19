import { describe, it, expect } from "vitest";
import { resolveApiKey, defaultAuthPaths } from "../../src/auth.js";

describe("resolveApiKey", () => {
  it("returns provided key first", () => {
    expect(resolveApiKey("qwen_provided")).toBe("qwen_provided");
  });

  it("falls back to env var", () => {
    expect(
      resolveApiKey(undefined, {
        env: { QWENCLOUD_API_KEY: "qwen_env" },
      }),
    ).toBe("qwen_env");
  });

  it("falls back to auth.json with apiKey field", () => {
    const readFile = () => JSON.stringify({ apiKey: "qwen_from_file" });
    const fileExists = () => true;
    expect(resolveApiKey(undefined, { readFile, fileExists })).toBe("qwen_from_file");
  });

  it("falls back to auth.json with qwencloud string field", () => {
    const readFile = () => JSON.stringify({ qwencloud: "qwen_cp_string" });
    const fileExists = () => true;
    expect(resolveApiKey(undefined, { readFile, fileExists })).toBe("qwen_cp_string");
  });

  it("falls back to auth.json with qwencloud OAuth-style object", () => {
    const readFile = () =>
      JSON.stringify({
        qwencloud: { type: "oauth", access: "qwen_oauth_key" },
      });
    const fileExists = () => true;
    expect(resolveApiKey(undefined, { readFile, fileExists })).toBe("qwen_oauth_key");
  });

  it("returns undefined when no key is available", () => {
    const readFile = () => {
      throw new Error("ENOENT");
    };
    const fileExists = () => false;
    expect(resolveApiKey(undefined, { readFile, fileExists })).toBeUndefined();
  });

  it("skips malformed auth.json", () => {
    const readFile = () => "not json";
    const fileExists = () => true;
    expect(resolveApiKey(undefined, { readFile, fileExists })).toBeUndefined();
  });

  it("QWENCLOUD_API_KEY env wins over populated auth file", () => {
    const readFile = () => JSON.stringify({ apiKey: "qwen_from_file" });
    const fileExists = () => true;
    expect(
      resolveApiKey(undefined, {
        env: { QWENCLOUD_API_KEY: "qwen_env_wins" },
        readFile,
        fileExists,
      }),
    ).toBe("qwen_env_wins");
  });
});

describe("defaultAuthPaths", () => {
  it("includes pi auth.json path", () => {
    const paths = defaultAuthPaths("/home/user");
    expect(paths).toContain("/home/user/.pi/agent/auth.json");
  });
});
