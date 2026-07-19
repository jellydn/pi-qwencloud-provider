/**
 * QwenCloud provider — constants and environment helpers.
 *
 * @module qwencloud-env
 */

/** Default QwenCloud API base URL (Token Plan endpoint). */
export const DEFAULT_API_BASE =
  "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1";

/** Endpoint path appended to the base for chat completions. */
export const DEFAULT_ENDPOINT = "/chat/completions";

/** Name of the env var that holds the QwenCloud API key. */
export const ENV_API_KEY = "QWENCLOUD_API_KEY";

/**
 * The QwenCloud provider name used in pi (pi registerProvider name).
 * Models are referenced as `qwencloud/<model-slug>`.
 */
export const PROVIDER_NAME = "qwencloud";

/**
 * Resolve the API base URL, allowing override via QWENCLOUD_API_BASE env var.
 * Normalizes the result: trims whitespace, treats empty value as missing,
 * and removes trailing slashes to prevent malformed endpoint concatenation.
 */
export function resolveApiBase(env: Record<string, string | undefined> = process.env): string {
  const base = env.QWENCLOUD_API_BASE?.trim();
  if (!base) return DEFAULT_API_BASE;
  return base.replace(/\/+$/, "");
}

/** Regex matching control characters (0x00-0x1F) and DEL (0x7F). */
const CONTROL_CHARS_RE = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`,
  "g",
);

/**
 * Remove terminal paste wrappers and control chars from API key input.
 */
export function sanitizeApiKey(input: string): string {
  const esc = "\x1b";
  return input
    .replaceAll(`${esc}[200~`, "")
    .replaceAll(`${esc}[201~`, "")
    .replaceAll("[200~", "")
    .replaceAll("[201~", "")
    .replace(CONTROL_CHARS_RE, "")
    .trim();
}

/**
 * Build the chat completions endpoint URL for a given API base.
 */
export function buildEndpointUrl(base: string): string {
  return `${base}${DEFAULT_ENDPOINT}`;
}
