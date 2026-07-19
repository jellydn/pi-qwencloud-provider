---
"pi-qwencloud-provider": minor
---

Architecture deepening — splits the 445-line `models.ts` hotspot into three focused modules:

- `thinking.ts` — reasoning-effort maps + `thinkingMapFor()` / `reasoningEffortFor()` translation interfaces
- `catalog.ts` — static model data, compat flags, and non-chat model filtering
- `discovery.ts` — remote model fetch, parse, and `resolveModels()`

Also collapses `walkAuthPaths` into `resolveApiKey`, moves `sanitizeApiKey` to its only caller, and deletes dead endpoint helpers from `env.ts`. Non-chat models (Wan, HappyHorse) are now consistently appended to remote results. Tests split along the module seam — 102 tests across 11 files.
