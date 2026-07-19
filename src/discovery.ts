/**
 * Dynamic model discovery from the QwenCloud `/models` endpoint.
 *
 * Fetches the live model list at startup (5s timeout), parses the
 * OpenAI-compatible response, and falls back to the static catalog on
 * any error. Non-chat model families are excluded.
 *
 * Imports the catalog for fallback lookups; imports thinking for the
 * reasoning-effort selection rule.
 *
 * @module qwencloud-discovery
 */

import { resolveApiBase } from "./env.js";
import { booleanValue, isRecord, numberValue, stringValue } from "./utils.js";
import { type ModelConfig, MODELS, isNonChatModel } from "./catalog.js";
import { thinkingMapFor } from "./thinking.js";

// ─── Constants ─────────────────────────────────────────────────────────────

/** Endpoint for listing models (OpenAI-compatible, relative to API base). */
export const MODELS_ENDPOINT = "/models";

/** Timeout for the model-list fetch (ms). */
export const MODELS_FETCH_TIMEOUT_MS = 5_000;

// ─── Parsing ───────────────────────────────────────────────────────────────

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
  const reasoning = booleanValue(raw.reasoning) ?? fallback?.reasoning ?? true;

  // Parse pricing — OpenAI format uses string $/token; we use $/M tokens
  const pricing = isRecord(raw.pricing) ? raw.pricing : undefined;
  const cost = {
    input: toMicroPerToken(pricing?.prompt, fallback?.cost.input ?? 0),
    output: toMicroPerToken(pricing?.completion, fallback?.cost.output ?? 0),
    cacheRead: toMicroPerToken(pricing?.cached_input, fallback?.cost.cacheRead ?? 0),
    cacheWrite: fallback?.cost.cacheWrite ?? 0,
  };

  // Single compat-merge rule (vs two in the old models.ts).
  const compat = fallback?.compat;

  return {
    id,
    name,
    reasoning,
    input: fallback?.input ?? ["text"],
    cost,
    contextWindow,
    maxTokens,
    // Single map-selection rule — delegated to thinking.ts.
    thinkingLevelMap: thinkingMapFor(reasoning, fallback?.thinkingLevelMap),
    compat: compat ?? {
      // Re-derive from catalog defaults when no fallback exists.
      supportsDeveloperRole: false,
    },
  };
}

// ─── Fetch ─────────────────────────────────────────────────────────────────

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

// ─── Resolve ──────────────────────────────────────────────────────────────

/**
 * Resolve the model list for registration.
 *
 * Tries the remote API first (if an API key is available), falling back to
 * the static `MODELS` array on any error.
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
