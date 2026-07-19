/**
 * Model definitions — barrel re-export.
 *
 * The old 445-line models.ts is split into three modules behind a single
 * re-export surface so no consumer code changes:
 *
 *   thinking.ts   — reasoning-effort maps + translation interface
 *   catalog.ts    — static model data + compat + filtering
 *   discovery.ts  — fetch / parse / resolveModels (imports catalog + thinking)
 *
 * @module qwencloud-models
 */

// ─── Thinking (reasoning-effort translation) ───────────────────────────────
export {
  type ThinkingLevel,
  type ThinkingLevelMap,
  DEFAULT_THINKING_LEVEL_MAP,
  DEEPSEEK_V4_THINKING_MAP,
  GLM_52_THINKING_MAP,
  NO_THINKING_MAP,
  reasoningEffortFor,
  thinkingMapFor,
} from "./thinking.js";

// ─── Catalog (static model data) ───────────────────────────────────────────
export {
  type QwenCloudOpenAICompat,
  QWENCLOUD_OPENAI_COMPAT,
  type ModelConfig,
  MODELS,
  modelIds,
  isNonChatModel,
} from "./catalog.js";

// ─── Discovery (dynamic model fetch) ───────────────────────────────────────
export {
  MODELS_ENDPOINT,
  MODELS_FETCH_TIMEOUT_MS,
  type RemoteModelsOptions,
  fetchRemoteModels,
  resolveModels,
} from "./discovery.js";
