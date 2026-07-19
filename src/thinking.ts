/**
 * Reasoning-effort translation for QwenCloud models.
 *
 * Each model owns a `ThinkingLevelMap` that translates pi's six thinking
 * levels to provider-specific `reasoning_effort` values (or `null` for
 * unsupported). This module owns the maps and two interfaces:
 *
 *   `thinkingMapFor(reasoning, fallbackMap?)` — selects the correct
 *     map; used by discovery.ts to replace the old inline ternary.
 *
 *   `reasoningEffortFor(map, level)` — translates a single pi thinking
 *     level to a provider reasoning_effort string.
 *
 * @module qwencloud-thinking
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Pi thinking levels that models map to provider-specific reasoning_effort. */
export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

/**
 * Explicit capability matrix mapping every thinking level to a
 * provider-specific `reasoning_effort` string or `null` (unsupported).
 */
export type ThinkingLevelMap = Readonly<Record<ThinkingLevel, string | null>>;

// ─── Translation Functions ───────────────────────────────────────────────────

/**
 * Translate a pi thinking level to a QwenCloud reasoning_effort value.
 *
 * @param map       The model's thinking level map.
 * @param level     The pi thinking level to translate.
 * @returns         The provider reasoning_effort string, or `null` if
 *                  the level is unsupported for this model.
 */
export function reasoningEffortFor(map: ThinkingLevelMap, level: ThinkingLevel): string | null {
  return map[level];
}

/**
 * Select the thinking level map for a model based on whether it supports
 * reasoning and has a known fallback map.
 *
 * This is the single map-selection rule shared by catalog and discovery.
 *
 * @param reasoning   Whether the model supports reasoning.
 * @param fallbackMap Optional known fallback from the static catalog.
 * @returns           The appropriate `ThinkingLevelMap` for the model.
 */
export function thinkingMapFor(
  reasoning: boolean,
  fallbackMap?: ThinkingLevelMap,
): ThinkingLevelMap {
  if (!reasoning) return NO_THINKING_MAP;
  return fallbackMap ?? DEFAULT_THINKING_LEVEL_MAP;
}

// ─── Thinking Level Maps ─────────────────────────────────────────────────────

/**
 * Default thinking level map for Qwen models.
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
