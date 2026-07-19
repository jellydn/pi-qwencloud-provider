import { describe, it, expect, vi } from "vitest";
import { handleQwenCloudError } from "../../src/error-handler.js";
import { PROVIDER_NAME } from "../../src/env.js";
import { QWENCLOUD_ERROR_MESSAGES } from "../../src/errors.js";

type MessageEndEvent = {
  message: {
    stopReason?: string;
    errorMessage?: string;
    provider?: string;
  };
};

type HandlerCtx = {
  hasUI: boolean;
  ui: { notify: (msg: string, type: "info" | "warning" | "error") => void };
  model?: { provider?: string };
};

function makeUICtx(notifyCalls: { msg: string; type: string }[]): HandlerCtx {
  return {
    hasUI: true,
    ui: {
      notify: (msg: string, type: string) => notifyCalls.push({ msg, type }),
    },
    model: { provider: PROVIDER_NAME },
  };
}

describe("handleQwenCloudError", () => {
  it("surfaces friendly message for 401 errors", () => {
    const notifyCalls: { msg: string; type: string }[] = [];
    handleQwenCloudError(
      {
        message: {
          stopReason: "error",
          errorMessage: "401 Unauthorized",
          provider: PROVIDER_NAME,
        },
      } as MessageEndEvent,
      makeUICtx(notifyCalls),
    );

    expect(notifyCalls).toHaveLength(1);
    expect(notifyCalls[0].msg).toBe(QWENCLOUD_ERROR_MESSAGES.auth_invalid);
    expect(notifyCalls[0].type).toBe("error");
  });

  it("surfaces friendly message for 403 errors", () => {
    const notifyCalls: { msg: string; type: string }[] = [];
    handleQwenCloudError(
      {
        message: {
          stopReason: "error",
          errorMessage: "403 Forbidden",
          provider: PROVIDER_NAME,
        },
      } as MessageEndEvent,
      makeUICtx(notifyCalls),
    );

    expect(notifyCalls).toHaveLength(1);
    expect(notifyCalls[0].msg).toBe(QWENCLOUD_ERROR_MESSAGES.auth_expired);
  });

  it("surfaces friendly message for 429 errors", () => {
    const notifyCalls: { msg: string; type: string }[] = [];
    handleQwenCloudError(
      {
        message: {
          stopReason: "error",
          errorMessage: "429 Too Many Requests",
          provider: PROVIDER_NAME,
        },
      } as MessageEndEvent,
      makeUICtx(notifyCalls),
    );

    expect(notifyCalls).toHaveLength(1);
    expect(notifyCalls[0].msg).toBe(QWENCLOUD_ERROR_MESSAGES.rate_limited);
  });

  it("uses ctx.model.provider when message has no provider field", () => {
    const notifyCalls: { msg: string; type: string }[] = [];
    handleQwenCloudError(
      {
        message: { stopReason: "error", errorMessage: "401 Bad Key" },
      } as MessageEndEvent,
      makeUICtx(notifyCalls),
    );

    expect(notifyCalls).toHaveLength(1);
    expect(notifyCalls[0].msg).toBe(QWENCLOUD_ERROR_MESSAGES.auth_invalid);
  });

  it("ignores errors from other providers", () => {
    const notifyCalls: { msg: string; type: string }[] = [];
    handleQwenCloudError(
      {
        message: {
          stopReason: "error",
          errorMessage: "401 Unauthorized",
          provider: "openai",
        },
      } as MessageEndEvent,
      {
        hasUI: true,
        ui: {
          notify: (msg: string, type: string) => notifyCalls.push({ msg, type }),
        },
        model: { provider: "openai" },
      },
    );

    expect(notifyCalls).toHaveLength(0);
  });

  it("ignores non-error messages", () => {
    const notifyCalls: { msg: string; type: string }[] = [];
    handleQwenCloudError(
      {
        message: { stopReason: "stop", provider: PROVIDER_NAME },
      } as MessageEndEvent,
      makeUICtx(notifyCalls),
    );

    expect(notifyCalls).toHaveLength(0);
  });

  it("falls back to console.error when no UI", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    handleQwenCloudError(
      {
        message: {
          stopReason: "error",
          errorMessage: "401 Unauthorized",
          provider: PROVIDER_NAME,
        },
      } as MessageEndEvent,
      {
        hasUI: false,
        ui: { notify: () => {} },
        model: { provider: PROVIDER_NAME },
      },
    );

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain("[qw]");
    expect(errorSpy.mock.calls[0][0]).toContain(QWENCLOUD_ERROR_MESSAGES.auth_invalid);
    errorSpy.mockRestore();
  });
});
