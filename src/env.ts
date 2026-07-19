/**
 * QwenCloud provider — constants and environment helpers.
 *
 * @module qwencloud-env
 */

/** Default QwenCloud API base URL (Token Plan endpoint). */
export const DEFAULT_API_BASE =
  "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1";

/** Name of the env var that holds the QwenCloud API key. */
export const ENV_API_KEY = "QWENCLOUD_API_KEY";

/**
 * The QwenCloud provider name used in pi (pi registerProvider name).
 * Models are referenced as `qw/<model-slug>`. Short name avoids clashes
 * with the clinepass provider (both have deepseek-v4-pro and glm-5.2).
 */
export const PROVIDER_NAME = "qw";

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
