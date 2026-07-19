/**
 * Reasoning-effort translation for QwenCloud models.
 *
 * Each model owns a `ThinkingLevelMap` that translates pi's six thinking
 * levels to provider-specific `reasoning_effort` values (or `null` for
 * unsupported). This module owns the maps and the single interface that
 * all consumers call — catalog, discovery, and model config all go through
 * `reasoningEffortFor()`.
 *
 * @module qwencloud-thinking
 */

/** Pi thinking levels that models map to provider-specific reasoning_effort. */
export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

/**
 * Explicit capability matrix mapping every thinking level to a
 * provider-specific `reasoning_effort` string or `null` (unsupported).
 */
export type ThinkingLevelMap = Readonly<Record<ThinkingLevel, string | null>>;

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
