/**
 * QwenCloud model definitions and dynamic model discovery.
 *
 * @module qwencloud-models
 */

import { resolveApiBase } from "./env.js";
import { booleanValue, isRecord, numberValue, stringValue } from "./utils.js";

// ─── Model Definitions ─────────────────────────────────────────────────────

/** Pi thinking levels that models map to provider-specific reasoning_effort. */
export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

/**
 * Explicit capability matrix mapping every thinking level to a
 * provider-specific `reasoning_effort` string or `null` (unsupported).
 */
export type ThinkingLevelMap = Readonly<Record<ThinkingLevel, string | null>>;

/**
 * Default thinking level map for Qwen models without a static fallback.
 * QwenCloud supports low/medium/high reasoning effort levels and "none"
 * to explicitly disable reasoning (verified against live API).
 */
export const DEFAULT_THINKING_LEVEL_MAP: ThinkingLevelMap = {
  off: "none",
  minimal: null,
  low: "low",
  medium: "medium",
  high: "high",
  xhigh: null,
};

/**
 * DeepSeek V4 Pro thinking level map.
 * Chat API only accepts `high` / `max` for DeepSeek; `xhigh` is mapped
 * to `max` per docs (low/medium → high, xhigh → max on the server side).
 */
export const DEEPSEEK_V4_THINKING_MAP: ThinkingLevelMap = {
  off: "none",
  minimal: null,
  low: null,
  medium: null,
  high: "high",
  xhigh: "max",
};

/**
 * GLM-5.2 thinking level map — supports low/medium/high/xhigh + "none".
 */
export const GLM_52_THINKING_MAP: ThinkingLevelMap = {
  off: "none",
  minimal: null,
  low: "low",
  medium: "medium",
  high: "high",
  xhigh: "xhigh",
};

/**
 * All-null thinking level map for non-reasoning models.
 */
export const NO_THINKING_MAP: ThinkingLevelMap = {
  off: null,
  minimal: null,
  low: null,
  medium: null,
  high: null,
  xhigh: null,
};

/**
 * OpenAI-compat flags for QwenCloud chat completions.
 *
 * QwenCloud uses the standard OpenAI Chat Completions format and
 * supports both `system` and `developer` roles.
 */
export interface QwenCloudOpenAICompat {
  readonly supportsDeveloperRole: boolean;
  readonly thinkingFormat?: string;
}

export const QWENCLOUD_OPENAI_COMPAT: QwenCloudOpenAICompat = {
  supportsDeveloperRole: true,
};

/**
 * QwenCloud model configuration.
 *
 * Model IDs are the API model names (e.g. "qwen3.7-plus"). pi references
 * them as `qw/<id>` (provider/model format). The qw/ prefix
 * is NOT part of the model ID — it's the provider namespace.
 *
 * Note: image generation (Wan) and video generation (HappyHorse) models
 * are included in the catalog for reference but use separate API endpoints
 * (not chat/completions). They are listed with `reasoning: false` and
 * minimal cost metadata.
 */
export interface ModelConfig {
  id: string;
  name: string;
  reasoning: boolean;
  input: readonly ["text"] | readonly ["text", "image"];
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  contextWindow: number;
  maxTokens: number;
  /**
   * Maps every pi thinking level to a provider-specific reasoning_effort
   * string, or `null` to mark a level as unsupported.
   */
  thinkingLevelMap: ThinkingLevelMap;
  /** pi-ai openai-completions compat overrides for the QwenCloud API. */
  compat: QwenCloudOpenAICompat;
}

/** Static catalog entries; per-model compat overrides merge with QWENCLOUD_OPENAI_COMPAT. */
interface ModelConfigBase extends Omit<ModelConfig, "compat"> {
  compat?: Partial<QwenCloudOpenAICompat>;
}

const MODELS_BASE: readonly ModelConfigBase[] = [
  // ── Qwen Text Models ─────────────────────────────────────────────────
  {
    id: "qwen3.8-max-preview",
    name: "Qwen3.8 Max Preview (QwenCloud)",
    reasoning: true,
    input: ["text"],
    // Cost estimate — Token Plan reference pricing for usage tracking only.
    cost: { input: 2.5, output: 7.5, cacheRead: 0.5, cacheWrite: 3.125 },
    contextWindow: 262_144,
    maxTokens: 131_072,
    thinkingLevelMap: DEFAULT_THINKING_LEVEL_MAP,
  },
  {
    id: "qwen3.7-plus",
    name: "Qwen3.7 Plus (QwenCloud)",
    reasoning: true,
    input: ["text"],
    // Estimated ≤256K tier pricing.
    cost: { input: 0.4, output: 1.6, cacheRead: 0.04, cacheWrite: 0.5 },
    contextWindow: 1_048_576,
    maxTokens: 131_072,
    thinkingLevelMap: DEFAULT_THINKING_LEVEL_MAP,
  },
  {
    id: "qwen3.7-max",
    name: "Qwen3.7 Max (QwenCloud)",
    reasoning: true,
    input: ["text"],
    cost: { input: 2.5, output: 7.5, cacheRead: 0.5, cacheWrite: 3.125 },
    contextWindow: 262_144,
    maxTokens: 131_072,
    thinkingLevelMap: DEFAULT_THINKING_LEVEL_MAP,
  },
  {
    id: "qwen3.6-flash",
    name: "Qwen3.6 Flash (QwenCloud)",
    reasoning: true,
    input: ["text"],
    // Official Token Plan pricing (≤256K tier): 0.25 / 1.50.
    cost: { input: 0.25, output: 1.5, cacheRead: 0.025, cacheWrite: 0.25 },
    contextWindow: 131_072,
    maxTokens: 131_072,
    thinkingLevelMap: DEFAULT_THINKING_LEVEL_MAP,
  },
  // ── DeepSeek Models ──────────────────────────────────────────────────
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro (QwenCloud)",
    reasoning: true,
    input: ["text"],
    // Pricing estimate — Token Plan rate unconfirmed for this model.
    // Alibaba China aggregator lists 0.435 / 0.87, but Token Plan may differ.
    cost: { input: 1.74, output: 3.48, cacheRead: 0.0145, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 384_000,
    thinkingLevelMap: DEEPSEEK_V4_THINKING_MAP,
  },
  // ── Zhipu AI Models ─────────────────────────────────────────────────
  {
    id: "glm-5.2",
    name: "GLM-5.2 (QwenCloud)",
    reasoning: true,
    input: ["text"],
    // Official Token Plan pricing: 1.10 / 3.85, cache read 0.275.
    cost: { input: 1.1, output: 3.85, cacheRead: 0.275, cacheWrite: 0 },
    contextWindow: 200_000,
    maxTokens: 131_072,
    thinkingLevelMap: GLM_52_THINKING_MAP,
  },
  // ── Wan Image Generation Models ─────────────────────────────────────
  // These use separate API endpoints (not chat/completions) but are
  // included in the catalog for model discovery. Placeholder context/token
  // values prevent potential division-by-zero in pi's UI calculations.
  {
    id: "wan2.7-image",
    name: "Wan2.7 Image (QwenCloud)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8_192,
    maxTokens: 4_096,
    thinkingLevelMap: NO_THINKING_MAP,
  },
  {
    id: "wan2.7-image-pro",
    name: "Wan2.7 Image Pro (QwenCloud)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8_192,
    maxTokens: 4_096,
    thinkingLevelMap: NO_THINKING_MAP,
  },
  // ── HappyHorse Video Generation Models ───────────────────────────────
  {
    id: "happyhorse-1.1-i2v",
    name: "HappyHorse 1.1 Image-to-Video (QwenCloud)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8_192,
    maxTokens: 4_096,
    thinkingLevelMap: NO_THINKING_MAP,
  },
  {
    id: "happyhorse-1.1-t2v",
    name: "HappyHorse 1.1 Text-to-Video (QwenCloud)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8_192,
    maxTokens: 4_096,
    thinkingLevelMap: NO_THINKING_MAP,
  },
  {
    id: "happyhorse-1.1-r2v",
    name: "HappyHorse 1.1 Reference-to-Video (QwenCloud)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8_192,
    maxTokens: 4_096,
    thinkingLevelMap: NO_THINKING_MAP,
  },
];

export const MODELS: readonly ModelConfig[] = MODELS_BASE.map((model) => ({
  ...model,
  compat: {
    ...QWENCLOUD_OPENAI_COMPAT,
    ...model.compat,
  },
}));

/**
 * Return the model IDs registered for the QwenCloud provider.
 */
export function modelIds(): string[] {
  return MODELS.map((m) => m.id);
}

// ─── Non-Chat Model Filtering ──────────────────────────────────────────────

/**
 * Non-chat model families that should NOT be registered for chat completions.
 * These use separate async task APIs (image/video generation), not
 * `/chat/completions`. Filtered out of dynamic discovery results.
 */
const NON_CHAT_FAMILIES = ["wan", "happyhorse", "qwen-image"];

/** Check whether a model ID belongs to a non-chat family. */
function isNonChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  return NON_CHAT_FAMILIES.some((family) => lower.includes(family));
}

// ─── Dynamic Model Discovery ───────────────────────────────────────────────

/** Endpoint for listing models (OpenAI-compatible, relative to API base). */
export const MODELS_ENDPOINT = "/models";

/** Timeout for the model-list fetch (ms). */
export const MODELS_FETCH_TIMEOUT_MS = 5_000;

/**
 * Raw model entry from the QwenCloud API `/models` endpoint.
 * Follows the OpenAI-compatible format.
 */
interface RawModelEntry {
  id?: unknown;
  name?: unknown;
  context_length?: unknown;
  max_output_tokens?: unknown;
  pricing?: unknown;
  reasoning?: unknown;
}

/** Convert a per-token price from the API to $/M tokens. */
function toMicroPerToken(val: unknown, fallbackVal: number): number {
  const n = numberValue(val);
  return n != null ? n * 1_000_000 : fallbackVal;
}

/**
 * Parse a single raw model entry into a `ModelConfig`.
 * Falls back to static-model values when the API doesn't provide a field.
 */
function parseRemoteModel(raw: RawModelEntry, fallback?: ModelConfig): ModelConfig | undefined {
  const id = stringValue(raw.id);
  if (!id) return undefined;

  const name = stringValue(raw.name) ?? fallback?.name ?? id;
  const contextWindow = numberValue(raw.context_length) ?? fallback?.contextWindow ?? 128_000;
  const maxTokens = numberValue(raw.max_output_tokens) ?? fallback?.maxTokens ?? 8_192;
  // Default to true — most QwenCloud text models support reasoning.
  // A missing `reasoning` field in the API response should not disable
  // reasoning capability that may exist upstream.
  const reasoning = booleanValue(raw.reasoning) ?? fallback?.reasoning ?? true;

  // Parse pricing — OpenAI format uses string $/token; we use $/M tokens
  const pricing = isRecord(raw.pricing) ? raw.pricing : undefined;
  const cost = {
    input: toMicroPerToken(pricing?.prompt, fallback?.cost.input ?? 0),
    output: toMicroPerToken(pricing?.completion, fallback?.cost.output ?? 0),
    cacheRead: toMicroPerToken(pricing?.cached_input, fallback?.cost.cacheRead ?? 0),
    cacheWrite: fallback?.cost.cacheWrite ?? 0,
  };

  return {
    id,
    name,
    reasoning,
    input: fallback?.input ?? ["text"],
    cost,
    contextWindow,
    maxTokens,
    thinkingLevelMap: reasoning
      ? (fallback?.thinkingLevelMap ?? DEFAULT_THINKING_LEVEL_MAP)
      : NO_THINKING_MAP,
    compat: {
      ...QWENCLOUD_OPENAI_COMPAT,
      ...fallback?.compat,
    },
  };
}

/**
 * Options for fetching remote models. All I/O is injectable for testability.
 */
export interface RemoteModelsOptions {
  apiBase?: string;
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

/**
 * Fetch the model list from the QwenCloud API `/models` endpoint.
 *
 * Returns parsed `ModelConfig[]` on success, or `undefined` on any error.
 * Callers should fall back to the static `MODELS` array when this returns
 * `undefined`.
 *
 * The endpoint follows the OpenAI-compatible format: `{ data: [{ id, ... }] }`
 * or a bare array `[{ id, ... }]`. Non-chat model families (wan, happyhorse,
 * qwen-image) are excluded.
 */
export async function fetchRemoteModels(
  options: RemoteModelsOptions = {},
): Promise<ModelConfig[] | undefined> {
  const apiBase = options.apiBase ?? resolveApiBase();
  const apiKey = options.apiKey;
  const fetchFn = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? MODELS_FETCH_TIMEOUT_MS;

  if (!apiKey || !fetchFn) return undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(`${apiBase}${MODELS_ENDPOINT}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });

    if (!response.ok) return undefined;

    const json: unknown = await response.json();
    const rawList: RawModelEntry[] = Array.isArray(json)
      ? json
      : isRecord(json) && Array.isArray(json.data)
        ? (json.data as RawModelEntry[])
        : [];

    if (rawList.length === 0) return undefined;

    // Build a lookup from the static MODELS for fallback values
    const staticById = new Map(MODELS.map((m) => [m.id, m]));

    const parsed = rawList.reduce<ModelConfig[]>((acc, raw) => {
      const id = stringValue(raw?.id);
      // Exclude non-chat families (image/video generation models).
      if (!id || isNonChatModel(id)) return acc;
      const model = parseRemoteModel(raw, staticById.get(id));
      if (model) acc.push(model);
      return acc;
    }, []);

    return parsed.length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve the model list for registration.
 *
 * Tries the remote API first (if an API key is available), falling back to
 * the static `MODELS` array on any error.
 *
 * @param apiKey The API key to use for the fetch (optional)
 * @param options I/O options for testability
 */
export async function resolveModels(
  apiKey?: string,
  options: RemoteModelsOptions = {},
): Promise<readonly ModelConfig[]> {
  if (apiKey) {
    const remote = await fetchRemoteModels({ ...options, apiKey });
    if (remote) return remote;
  }
  return MODELS;
}
