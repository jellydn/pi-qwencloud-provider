/**
 * QwenCloud Provider for pi
 *
 * Adds QwenCloud's Token Plan subscription as a pi provider, giving access to
 * Qwen3.8, DeepSeek V4, GLM-5.2, Wan image generation, and HappyHorse video
 * generation through QwenCloud's OpenAI-compatible API.
 *
 * Setup:
 *   1. Sign up at home.qwencloud.com and get a Token Plan
 *   2. Create an API key (API Keys section)
 *   3. Set QWENCLOUD_API_KEY env var, or run `pi /login` and select QwenCloud
 *   4. Install: pi install git:github.com/jellydn/pi-qwencloud-provider
 *   5. Use /model to select a QwenCloud model
 *
 * @module pi-qwencloud-provider
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { resolveApiBase, ENV_API_KEY, PROVIDER_NAME } from "./env.js";
import { resolveApiKey } from "./auth.js";
import { resolveModels } from "./models.js";
import { handleQwenCloudError } from "./error-handler.js";
import { getApiKey as oauthGetApiKey, login, refreshToken } from "./oauth.js";

// QwenCloud exposes a standard OpenAI-compatible chat completions API.
// It supports both `system` and `developer` roles, so `supportsDeveloperRole`
// is true by default for all models.

// ─── Extension Entry Point ─────────────────────────────────────────────────

export default async function (pi: ExtensionAPI) {
  const apiBase = resolveApiBase();

  // Attempt dynamic model discovery from the QwenCloud API. Falls back to the
  // static MODELS array on any error (network failure, 404, parse error).
  // The fetch has a 5-second timeout so startup is never blocked for long.
  const apiKey = resolveApiKey();
  const models = await resolveModels(apiKey, { apiBase });

  // Only register the $QWENCLOUD_API_KEY sigil when the env var is set at
  // extension load time. OAuth-only installs should not advertise an
  // unconfigured env-key fallback.
  const envApiKey = process.env[ENV_API_KEY]?.trim();

  pi.registerProvider(PROVIDER_NAME, {
    name: "QwenCloud",
    baseUrl: apiBase,
    ...(envApiKey ? { apiKey: `$${ENV_API_KEY}` } : {}),
    authHeader: true,
    // QwenCloud uses the standard OpenAI Chat Completions format, so pi's
    // built-in openai-completions streaming handles SSE + tool calls + usage.
    api: "openai-completions",
    oauth: {
      name: "QwenCloud",
      login,
      refreshToken,
      getApiKey: oauthGetApiKey,
    },
    // Spread the model object so all fields propagate to pi automatically.
    // Only `input` needs transformation: readonly tuple → mutable array.
    models: models.map((model) => ({
      ...model,
      input: [...model.input],
    })),
  });

  // ─── Error Surface ─────────────────────────────────────────────────────
  //
  // QwenCloud returns standard HTTP error codes. Without this handler, the
  // user sees a generic "Provider returned an error stop reason" message.
  // The handler in error-handler.ts owns the full pipeline:
  // filter → classify → deliver.
  pi.on("message_end", handleQwenCloudError);
}
