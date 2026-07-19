import { describe, it, expect } from "vitest";
import { classifyQwenCloudError, QWENCLOUD_ERROR_MESSAGES } from "../../src/errors.js";

describe("classifyQwenCloudError", () => {
  it("classifies 401 as auth_invalid", () => {
    const result = classifyQwenCloudError("Request failed with status 401");
    expect(result.type).toBe("auth_invalid");
    expect(result.message).toBe(QWENCLOUD_ERROR_MESSAGES.auth_invalid);
  });

  it("classifies 'unauthorized' as auth_invalid", () => {
    const result = classifyQwenCloudError("Unauthorized: invalid credentials");
    expect(result.type).toBe("auth_invalid");
  });

  it("classifies 'invalid api key' as auth_invalid", () => {
    const result = classifyQwenCloudError("invalid api key provided");
    expect(result.type).toBe("auth_invalid");
  });

  it("classifies 403 as auth_expired", () => {
    const result = classifyQwenCloudError("Request failed with status 403");
    expect(result.type).toBe("auth_expired");
    expect(result.message).toBe(QWENCLOUD_ERROR_MESSAGES.auth_expired);
  });

  it("classifies 'token expired' as auth_expired", () => {
    const result = classifyQwenCloudError("token expired");
    expect(result.type).toBe("auth_expired");
  });

  it("classifies 429 as rate_limited", () => {
    const result = classifyQwenCloudError("Request failed with status 429");
    expect(result.type).toBe("rate_limited");
    expect(result.message).toBe(QWENCLOUD_ERROR_MESSAGES.rate_limited);
  });

  it("classifies 'rate limit' as rate_limited", () => {
    const result = classifyQwenCloudError("rate limit exceeded");
    expect(result.type).toBe("rate_limited");
  });

  it("classifies 'quota exceeded' as insufficient_quota", () => {
    const result = classifyQwenCloudError("quota exceeded for this plan");
    expect(result.type).toBe("insufficient_quota");
    expect(result.message).toBe(QWENCLOUD_ERROR_MESSAGES.insufficient_quota);
  });

  it("classifies unknown errors as unknown", () => {
    const result = classifyQwenCloudError("Internal server error");
    expect(result.type).toBe("unknown");
    expect(result.message).toBe(QWENCLOUD_ERROR_MESSAGES.unknown);
  });

  it("is case-insensitive", () => {
    const result = classifyQwenCloudError("UNAUTHORIZED: Access Denied");
    expect(result.type).toBe("auth_invalid");
  });

  it("handles empty string", () => {
    const result = classifyQwenCloudError("");
    expect(result.type).toBe("unknown");
  });
});
