/**
 * Wan image generation via the QwenCloud Token Plan API.
 *
 * Wan uses a separate synchronous endpoint (not chat/completions).
 * Generated image URLs expire after 24 hours, so this module downloads
 * and saves images to disk immediately.
 *
 * @module qwencloud-wan
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { resolveApiBase } from "./env.js";
import { resolveApiKey } from "./auth.js";
import { isRecord } from "./utils.js";

// ─── Constants ─────────────────────────────────────────────────────────────

/** Wan multimodal generation endpoint (synchronous). */
const WAN_ENDPOINT = "/api/v1/services/aigc/multimodal-generation/generation";

/** Default Wan model. */
const DEFAULT_WAN_MODEL = "wan2.7-image";

/** Supported Wan models. */
const WAN_MODELS = new Set(["wan2.7-image", "wan2.7-image-pro"]);

/** Supported output sizes. */
const WAN_SIZES = new Set(["1K", "2K", "4K"]);

// ─── Types ─────────────────────────────────────────────────────────────────

export interface WanGenerateOptions {
  /** Wan model ID. Default: "wan2.7-image". */
  model?: string;
  /** Output size: "1K", "2K", or "4K". Default: "1K". */
  size?: string;
  /** Number of images (1-4). Default: 1. */
  n?: number;
  /** Optional API key override. */
  apiKey?: string;
  /** Injectable fetch for testing. */
  fetch?: typeof globalThis.fetch;
}

export interface WanGeneratedImage {
  /** Temporary OSS URL (expires in ~24h). */
  url: string;
  /** Local file path after download. */
  localPath: string;
  /** Model used. */
  model: string;
  /** Output size. */
  size: string;
}

// ─── API call ──────────────────────────────────────────────────────────────

/**
 * Call the Wan image generation endpoint and return the resulting image URL.
 *
 * Throws on API errors, network failures, or missing API key.
 */
export async function generateWanImage(
  prompt: string,
  options: WanGenerateOptions = {},
): Promise<WanGeneratedImage> {
  const apiKey = options.apiKey ?? resolveApiKey();
  if (!apiKey) {
    throw new Error("No QwenCloud API key found. Set QWENCLOUD_API_KEY or run `/login`.");
  }

  const model = options.model ?? DEFAULT_WAN_MODEL;
  if (!WAN_MODELS.has(model)) {
    throw new Error(`Unknown Wan model: ${model}. Supported: ${[...WAN_MODELS].join(", ")}`);
  }

  const size = options.size ?? "1K";
  if (!WAN_SIZES.has(size)) {
    throw new Error(`Unknown size: ${size}. Supported: ${[...WAN_SIZES].join(", ")}`);
  }

  const n = options.n ?? 1;
  if (n < 1 || n > 4) {
    throw new Error(`n must be 1-4, got ${n}`);
  }

  // Derive the Wan endpoint from the chat API base URL.
  // Chat base: https://...token-plan.../compatible-mode/v1
  // Wan:       https://...token-plan.../api/v1/services/aigc/multimodal-generation/generation
  const chatBase = resolveApiBase();
  const rootBase = chatBase.replace(/\/compatible-mode\/v1\/?$/, "");
  const url = `${rootBase}${WAN_ENDPOINT}`;

  const fetchFn = options.fetch ?? globalThis.fetch;

  const body = {
    model,
    input: {
      messages: [{ role: "user", content: [{ text: prompt }] }],
    },
    parameters: {
      size,
      n,
    },
  };

  const response = await fetchFn(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "(no body)");
    throw new Error(`Wan API returned ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const data: unknown = await response.json();

  if (!isRecord(data)) {
    throw new Error("Unexpected Wan API response format");
  }

  const output = data.output;
  if (!isRecord(output)) {
    throw new Error("Wan response missing output field");
  }

  const choices = output.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("Wan response has no images");
  }

  const content = (choices[0] as Record<string, unknown>)?.message;
  if (!isRecord(content)) {
    throw new Error("Wan response missing message content");
  }

  const contentItems = content.content;
  if (!Array.isArray(contentItems) || contentItems.length === 0) {
    throw new Error("Wan response content is empty");
  }

  const imageItem = contentItems[0] as Record<string, unknown>;
  const imageUrl = typeof imageItem?.image === "string" ? imageItem.image : undefined;

  if (!imageUrl) {
    throw new Error("No image URL in Wan response");
  }

  return {
    url: imageUrl,
    localPath: "", // filled after download
    model,
    size,
  };
}

// ─── Image download ────────────────────────────────────────────────────────

/**
 * Download the generated image from its OSS URL and save to a local file.
 *
 * OSS URLs expire after ~24 hours, so this should be called promptly
 * after generation.
 *
 * @param result - The generation result from `generateWanImage()`.
 * @param outputDir - Directory to save the image. Defaults to cwd.
 * @param fetchFn - Injectable fetch for testing.
 * @returns The updated result with `localPath` set.
 */
export async function downloadWanImage(
  result: WanGeneratedImage,
  outputDir: string,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): Promise<WanGeneratedImage> {
  const response = await fetchFn(result.url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // Ensure output directory exists.
  await mkdir(outputDir, { recursive: true });

  const filename = `wan-${Date.now()}.png`;
  const localPath = join(outputDir, filename);
  await writeFile(localPath, buffer);

  return { ...result, localPath };
}

/**
 * Full pipeline: generate + download in one call.
 *
 * @param prompt - Image description.
 * @param outputDir - Directory to save the image.
 * @param options - Generation options (model, size, n).
 * @returns The generation result with local path.
 */
export async function generateAndDownloadWanImage(
  prompt: string,
  outputDir: string,
  options: WanGenerateOptions = {},
): Promise<WanGeneratedImage> {
  const result = await generateWanImage(prompt, options);
  return downloadWanImage(result, outputDir, options.fetch);
}
