/**
 * QwenCloud login provider for pi's /login flow.
 *
 * QwenCloud uses simple API keys (no OAuth). The login flow:
 * 1. Opens the QwenCloud API Keys dashboard in the browser
 * 2. Prompts the user to paste their API key
 * 3. Returns credentials (the API key serves as both access and refresh token)
 *
 * Unlike ClinePass, there is no WorkOS OAuth, no token refresh, and no
 * credential extraction from Cline CLI config files.
 */

import type { OAuthCredentials, OAuthLoginCallbacks } from "@earendil-works/pi-ai";
import { sanitizeApiKey } from "./env.js";

const DASHBOARD_URL = "https://home.qwencloud.com";
const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000; // API keys don't expire

// ─── Static API key helpers ────────────────────────────────────────────────

function credentialsFromApiKey(apiKey: string): OAuthCredentials {
  return {
    refresh: apiKey,
    access: apiKey,
    expires: Date.now() + TEN_YEARS_MS,
  };
}

// ─── Login flow ─────────────────────────────────────────────────────────────

/**
 * Start the QwenCloud login flow.
 *
 * Opens the QwenCloud dashboard so the user can find or create their API key,
 * then prompts them to paste it. Since QwenCloud uses static API keys with
 * no OAuth flow, this is a simple browser-assisted paste.
 */
export async function login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
  callbacks.onAuth({ url: DASHBOARD_URL });

  const apiKey = sanitizeApiKey(
    await callbacks.onPrompt({
      message:
        "Paste your QwenCloud API key " +
        "(find it at home.qwencloud.com → API Keys, under your Token Plan):",
    }),
  );

  if (!apiKey) throw new Error("No QwenCloud API key provided");

  if (apiKey.length < 20) {
    console.warn(
      `[qw] Warning: API key looks unusually short (${apiKey.length} chars). ` +
        "Verify you copied the full key from home.qwencloud.com → API Keys.",
    );
  }

  return credentialsFromApiKey(apiKey);
}

/**
 * Refresh QwenCloud credentials.
 *
 * Since QwenCloud uses static API keys that don't expire, this is a no-op.
 * The credentials are returned unchanged.
 */
export async function refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
  return credentialsFromApiKey(credentials.refresh);
}

/**
 * Returns the access token (API key) from credentials.
 */
export function getApiKey(credentials: OAuthCredentials): string {
  return credentials.access;
}
