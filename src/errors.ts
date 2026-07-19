/**
 * QwenCloud error classification — maps provider error messages to
 * user-friendly, actionable messages.
 *
 * @module qwencloud-errors
 */

/** Error types returned by the QwenCloud API. */
export type QwenCloudErrorType =
  | "auth_invalid"
  | "auth_expired"
  | "rate_limited"
  | "insufficient_quota"
  | "unknown";

/**
 * Check if a lowercased string matches any of the given patterns.
 */
function matchesAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p));
}

/**
 * User-friendly error messages for QwenCloud-specific failures.
 */
export const QWENCLOUD_ERROR_MESSAGES: Record<QwenCloudErrorType, string> = {
  auth_invalid:
    "QwenCloud API key is invalid. Check your key at home.qwencloud.com → API Keys, or run `pi /login` and select QwenCloud to re-enter it.",
  auth_expired:
    "QwenCloud API key has expired or your Token Plan has run out. Renew at home.qwencloud.com.",
  rate_limited:
    "QwenCloud rate limit reached. Wait a moment and try again, or upgrade your plan at home.qwencloud.com.",
  insufficient_quota:
    "QwenCloud quota exceeded. Check your usage at home.qwencloud.com or upgrade your Token Plan.",
  unknown:
    "QwenCloud request failed. Check your API key and plan status at home.qwencloud.com or run `pi /login`.",
};

/**
 * Classify a QwenCloud API error message into a specific error type.
 */
export function classifyQwenCloudError(errorMessage: string): {
  type: QwenCloudErrorType;
  message: string;
} {
  const lower = errorMessage.toLowerCase();

  if (
    matchesAny(lower, [
      "401",
      "unauthorized",
      "invalid api key",
      "invalid_api_key",
      "authentication failed",
      "incorrect api key",
    ])
  ) {
    return {
      type: "auth_invalid",
      message: QWENCLOUD_ERROR_MESSAGES.auth_invalid,
    };
  }

  if (matchesAny(lower, ["403", "forbidden", "access denied", "token expired", "plan expired"])) {
    return {
      type: "auth_expired",
      message: QWENCLOUD_ERROR_MESSAGES.auth_expired,
    };
  }

  if (matchesAny(lower, ["429", "rate limit", "too many requests", "rate_limit", "throttle"])) {
    return {
      type: "rate_limited",
      message: QWENCLOUD_ERROR_MESSAGES.rate_limited,
    };
  }

  if (matchesAny(lower, ["quota", "insufficient", "balance", "billing", "exceeded"])) {
    return {
      type: "insufficient_quota",
      message: QWENCLOUD_ERROR_MESSAGES.insufficient_quota,
    };
  }

  return { type: "unknown", message: QWENCLOUD_ERROR_MESSAGES.unknown };
}
