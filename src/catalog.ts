/**
 * Static QwenCloud model catalog — authored data, no I/O.
 *
 * Owns the curated model list, compatibility flags, and non-chat model
 * filtering. All data edits (pricing, vision input, new model slugs,
 * thinking level assignment) land here, separate from the fetch-and-parse
 * machinery in discovery.ts.
 *
 * @module qwencloud-catalog
 */

import {
  type ThinkingLevel,
  type ThinkingLevelMap,
  DEFAULT_THINKING_LEVEL_MAP,
  DEEPSEEK_V4_THINKING_MAP,
  GLM_52_THINKING_MAP,
  NO_THINKING_MAP,
} from "./thinking.js";

// Re-export thinking types for consumers that import from catalog.
export type { ThinkingLevel, ThinkingLevelMap };

// ─── Compatibility ─────────────────────────────────────────────────────────

/**
 * OpenAI-compat flags for QwenCloud chat completions.
 */
export interface QwenCloudOpenAICompat {
  readonly supportsDeveloperRole: boolean;
  readonly thinkingFormat?: string;
}

// QwenCloud rejects the `developer` role — only accepts system/assistant/user/tool/function.
// pi-ai defaults to `developer` for reasoning models, so this must be false.
export const QWENCLOUD_OPENAI_COMPAT: QwenCloudOpenAICompat = {
  supportsDeveloperRole: false,
};

// ─── Model Configuration ───────────────────────────────────────────────────

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

/** Shared blueprint for non-chat model entries (image/video generation). */
function nonChatModel(id: string, name: string): ModelConfigBase {
  return {
    id,
    name,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8_192,
    maxTokens: 4_096,
    thinkingLevelMap: NO_THINKING_MAP,
  };
}

const MODELS_BASE: readonly ModelConfigBase[] = [
  // ── Qwen Text Models ─────────────────────────────────────────────────
  {
    id: "qwen3.8-max-preview",
    name: "Qwen3.8 Max Preview (QwenCloud)",
    reasoning: true,
    input: ["text", "image"],
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
    input: ["text", "image"],
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
    input: ["text", "image"],
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
  nonChatModel("wan2.7-image", "Wan2.7 Image (QwenCloud)"),
  nonChatModel("wan2.7-image-pro", "Wan2.7 Image Pro (QwenCloud)"),
  // ── HappyHorse Video Generation Models ───────────────────────────────
  nonChatModel("happyhorse-1.1-i2v", "HappyHorse 1.1 Image-to-Video (QwenCloud)"),
  nonChatModel("happyhorse-1.1-t2v", "HappyHorse 1.1 Text-to-Video (QwenCloud)"),
  nonChatModel("happyhorse-1.1-r2v", "HappyHorse 1.1 Reference-to-Video (QwenCloud)"),
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
export function isNonChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  return NON_CHAT_FAMILIES.some((family) => lower.includes(family));
}
