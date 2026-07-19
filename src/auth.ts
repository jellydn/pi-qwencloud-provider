/**
 * QwenCloud API key resolution — testable without pi runtime.
 *
 * Resolves the QwenCloud API key from:
 * 1. Explicit provided key argument
 * 2. QWENCLOUD_API_KEY environment variable
 * 3. pi auth config files (~/.pi/agent/auth.json)
 *
 * Unlike ClinePass, QwenCloud has no OAuth/WorkOS flow — only static API keys.
 *
 * @module qwencloud-auth
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isRecord, stringValue } from "./utils.js";
import { ENV_API_KEY, PROVIDER_NAME } from "./env.js";

/**
 * Default auth file paths checked in order.
 */
export function defaultAuthPaths(home: string): string[] {
  return [join(home, ".pi", "agent", "auth.json")];
}

export interface AuthKeyOptions {
  env?: Record<string, string | undefined>;
  authPaths?: readonly string[];
  homeDir?: () => string;
  readFile?: (path: string) => string;
  fileExists?: (path: string) => boolean;
}

/**
 * Iterate auth file paths in order, parsing JSON from each and extracting
 * a value. Suppresses ENOENT, warns on corrupt files.
 */
export function walkAuthPaths<T>(
  options: AuthKeyOptions,
  extract: (parsed: Record<string, unknown>) => T | undefined,
): T | undefined {
  const home = options.homeDir?.() ?? homedir();
  const authPaths = options.authPaths ?? defaultAuthPaths(home);
  const readFile = options.readFile ?? ((p: string) => readFileSync(p, "utf-8"));
  const fileExists = options.fileExists ?? ((p: string) => existsSync(p));

  for (const authPath of authPaths) {
    try {
      if (!fileExists(authPath)) continue;
      const parsed: unknown = JSON.parse(readFile(authPath));
      if (!isRecord(parsed)) continue;

      const result = extract(parsed);
      if (result !== undefined) return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("ENOENT") && !msg.includes("not found")) {
        console.warn(`[${PROVIDER_NAME}] Warning: failed to read auth file ${authPath}: ${msg}`);
      }
    }
  }
  return undefined;
}

/**
 * Resolve the QwenCloud API key.
 * Priority: provided key → QWENCLOUD_API_KEY env var → auth files
 *
 * Auth files checked:
 * - ~/.pi/agent/auth.json:
 *   { "qwencloud": "<key>" } or { "qwencloud": { "access": "<key>" } }
 *   or { "apiKey": "<key>" }
 */
export function resolveApiKey(
  providedKey?: string,
  options: AuthKeyOptions = {},
): string | undefined {
  if (providedKey) return providedKey;

  const env = options.env ?? process.env;
  if (env[ENV_API_KEY]) return env[ENV_API_KEY];

  return walkAuthPaths(options, (parsed) => {
    // Direct apiKey field
    const apiKey = stringValue(parsed.apiKey);
    if (apiKey) return apiKey;

    // qwencloud field (string or OAuth-style object)
    const qcField = parsed[PROVIDER_NAME];
    if (typeof qcField === "string") return qcField;
    if (isRecord(qcField)) {
      const access = stringValue(qcField.access);
      if (access) return access;
    }
    return undefined;
  });
}
