import { describe, it, expect } from "vitest";
import { resolveApiKey, defaultAuthPaths } from "../../src/auth.js";

describe("defaultAuthPaths", () => {
  it("resolves to ~/.pi/agent/auth.json", () => {
    const paths = defaultAuthPaths("/home/test");
    expect(paths).toHaveLength(1);
    expect(paths[0]).toBe("/home/test/.pi/agent/auth.json");
  });
});

describe("resolveApiKey", () => {
  it("returns provided key first", () => {
    expect(resolveApiKey("qw_provided")).toBe("qw_provided");
  });

  it("falls back to env var", () => {
    expect(
      resolveApiKey(undefined, {
        env: { QWENCLOUD_API_KEY: "qw_env" },
      }),
    ).toBe("qw_env");
  });

  it("falls back to auth.json with apiKey field", () => {
    const readFile = () => JSON.stringify({ apiKey: "qw_from_file" });
    const fileExists = () => true;
    expect(resolveApiKey(undefined, { readFile, fileExists })).toBe("qw_from_file");
  });

  it("falls back to auth.json with qw string field", () => {
    const readFile = () => JSON.stringify({ qw: "qw_string" });
    const fileExists = () => true;
    expect(resolveApiKey(undefined, { readFile, fileExists })).toBe("qw_string");
  });

  it("falls back to auth.json with qw OAuth-style object", () => {
    const readFile = () =>
      JSON.stringify({
        qw: { type: "oauth", access: "qw_oauth_key" },
      });
    const fileExists = () => true;
    expect(resolveApiKey(undefined, { readFile, fileExists })).toBe("qw_oauth_key");
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
    const readFile = () => JSON.stringify({ apiKey: "qw_from_file" });
    const fileExists = () => true;
    expect(
      resolveApiKey(undefined, {
        env: { QWENCLOUD_API_KEY: "qw_env_wins" },
        readFile,
        fileExists,
      }),
    ).toBe("qw_env_wins");
  });
});
