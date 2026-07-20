/**
 * HappyHorse video generation via the QwenCloud Token Plan API.
 *
 * HappyHorse uses an async task pattern (submit → poll → download),
 * unlike Wan's synchronous endpoint. Generated video URLs expire after
 * 24 hours, so this module downloads and saves videos to disk immediately.
 *
 * @module qwencloud-happyhorse
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { resolveApiBase } from "./env.js";
import { resolveApiKey } from "./auth.js";
import { isRecord, stringValue } from "./utils.js";

// ─── Constants ─────────────────────────────────────────────────────────────

/** HappyHorse video generation endpoint (async). */
const HAPPYHORSE_ENDPOINT = "/api/v1/services/aigc/video-generation/video-synthesis";

/** Task status polling endpoint. */
const TASK_ENDPOINT = "/api/v1/tasks";

/** Default HappyHorse model (text-to-video). */
const DEFAULT_HAPPYHORSE_MODEL = "happyhorse-1.1-t2v";

/** Supported HappyHorse models. */
const HAPPYHORSE_MODELS = new Set([
  "happyhorse-1.1-t2v",
  "happyhorse-1.1-i2v",
  "happyhorse-1.1-r2v",
]);

/** Polling interval in ms. */
const POLL_INTERVAL_MS = 15_000;

/** Maximum poll attempts before giving up (~10 min at 15s interval). */
const MAX_POLL_ATTEMPTS = 40;

// ─── Types ─────────────────────────────────────────────────────────────────

export interface HappyHorseGenerateOptions {
  /** HappyHorse model ID. Default: "happyhorse-1.1-t2v". */
  model?: string;
  /** Image URL for i2v/r2v models (optional for t2v). */
  imageUrl?: string;
  /** Video resolution. Default: "720P". */
  resolution?: string;
  /** Aspect ratio. Default: "16:9". */
  ratio?: string;
  /** Video duration in seconds (3–15). Default: 5. */
  duration?: number;
  /** Optional API key override. */
  apiKey?: string;
  /** Injectable fetch for testing. */
  fetch?: typeof globalThis.fetch;
  /** Override poll interval (ms). */
  pollIntervalMs?: number;
  /** Override max poll attempts. */
  maxPollAttempts?: number;
}

export interface HappyHorseGeneratedVideo {
  /** Temporary OSS URL (expires in ~24h). */
  url: string;
  /** Local file path after download. */
  localPath: string;
  /** Model used. */
  model: string;
  /** Task ID for reference. */
  taskId: string;
}

// ─── Submission ────────────────────────────────────────────────────────────

/**
 * Submit a video generation task to the HappyHorse API.
 *
 * Returns the task ID for polling. Throws on API errors or missing API key.
 */
async function submitTask(
  prompt: string,
  apiKey: string,
  model: string,
  imageUrl: string | undefined,
  apiBaseUrl: string,
  fetchFn: typeof globalThis.fetch,
  resolution: string,
  ratio: string,
  duration: number,
): Promise<string> {
  // Build the input payload based on model type.
  const input: Record<string, unknown> = {};

  if (model.endsWith("-t2v")) {
    // Text-to-video: prompt only.
    input.prompt = prompt;
  } else if (model.endsWith("-i2v") || model.endsWith("-r2v")) {
    // Image-to-video / reference-to-video: prompt + image URL.
    if (!imageUrl) {
      throw new Error(`Model ${model} requires an image URL. Pass { imageUrl } in options.`);
    }
    input.prompt = prompt;
    input.image_url = imageUrl;
  }

  const body = {
    model,
    input,
    parameters: {
      resolution,
      ratio,
      duration,
    },
  };

  const response = await fetchFn(apiBaseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "(no body)");
    throw new Error(`HappyHorse API returned ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const data: unknown = await response.json();

  if (!isRecord(data)) {
    throw new Error("Unexpected HappyHorse API response format");
  }

  const output = data.output;
  if (!isRecord(output)) {
    throw new Error("HappyHorse response missing output field");
  }

  const taskId = stringValue(output.task_id);
  if (!taskId) {
    throw new Error("HappyHorse response missing task_id");
  }

  return taskId;
}

// ─── Polling ───────────────────────────────────────────────────────────────

/**
 * Poll the task status endpoint until the video generation completes or fails.
 *
 * Returns the video URL on success. Throws on failure or timeout.
 */
async function pollTask(
  taskId: string,
  apiKey: string,
  taskBaseUrl: string,
  fetchFn: typeof globalThis.fetch,
  pollIntervalMs: number,
  maxPollAttempts: number,
): Promise<string> {
  const pollUrl = `${taskBaseUrl}/${taskId}`;

  for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const response = await fetchFn(pollUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "(no body)");
      throw new Error(`Task poll returned ${response.status}: ${errorBody.slice(0, 300)}`);
    }

    const data: unknown = await response.json();

    if (!isRecord(data)) {
      throw new Error("Unexpected task poll response format");
    }

    const output = data.output;
    if (!isRecord(output)) {
      throw new Error("Task poll response missing output field");
    }

    const status = stringValue(output.task_status);

    if (status === "SUCCEEDED") {
      const videoUrl = stringValue(output.video_url);
      if (!videoUrl) {
        throw new Error("Task succeeded but no video_url in response");
      }
      return videoUrl;
    }

    if (status === "FAILED" || status === "CANCELLED" || status === "UNKNOWN") {
      const message = stringValue(output.message) ?? "no details";
      throw new Error(`Video generation ${status.toLowerCase()}: ${message}`);
    }

    // PENDING or RUNNING — continue polling.
  }

  throw new Error(`Video generation timed out after ${maxPollAttempts} poll attempts`);
}

// ─── Public API ────────────────────────────────────────────────────────────

/** Derive the HappyHorse and task endpoints from the chat API base URL. */
function buildEndpoints(): { submitUrl: string; taskBaseUrl: string } {
  const chatBase = resolveApiBase();
  const rootBase = chatBase.replace(/\/compatible-mode\/v1\/?$/, "");
  return {
    submitUrl: `${rootBase}${HAPPYHORSE_ENDPOINT}`,
    taskBaseUrl: `${rootBase}${TASK_ENDPOINT}`,
  };
}

/**
 * Generate a video using HappyHorse (async task: submit → poll → download).
 *
 * @param prompt - Video description.
 * @param outputDir - Directory to save the video.
 * @param options - Generation options (model, imageUrl, polling config).
 * @returns The generation result with local path.
 */
export async function generateAndDownloadHappyHorseVideo(
  prompt: string,
  outputDir: string,
  options: HappyHorseGenerateOptions = {},
): Promise<HappyHorseGeneratedVideo> {
  const apiKey = options.apiKey ?? resolveApiKey();
  if (!apiKey) {
    throw new Error("No QwenCloud API key found. Set QWENCLOUD_API_KEY or run `/login`.");
  }

  const model = options.model ?? DEFAULT_HAPPYHORSE_MODEL;
  if (!HAPPYHORSE_MODELS.has(model)) {
    throw new Error(
      `Unknown HappyHorse model: ${model}. Supported: ${[...HAPPYHORSE_MODELS].join(", ")}`,
    );
  }

  const fetchFn = options.fetch ?? globalThis.fetch;
  const pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS;
  const maxPollAttempts = options.maxPollAttempts ?? MAX_POLL_ATTEMPTS;

  const { submitUrl, taskBaseUrl } = buildEndpoints();

  // 1. Submit the generation task.
  const taskId = await submitTask(
    prompt,
    apiKey,
    model,
    options.imageUrl,
    submitUrl,
    fetchFn,
    options.resolution ?? "720P",
    options.ratio ?? "16:9",
    options.duration ?? 5,
  );

  // 2. Poll for completion.
  const videoUrl = await pollTask(
    taskId,
    apiKey,
    taskBaseUrl,
    fetchFn,
    pollIntervalMs,
    maxPollAttempts,
  );

  // 3. Download the video.
  const localPath = await downloadVideo(videoUrl, outputDir, fetchFn);

  return { url: videoUrl, localPath, model, taskId };
}

// ─── Video download ────────────────────────────────────────────────────────

/**
 * Download the generated video from its OSS URL and save to a local file.
 *
 * OSS URLs expire after ~24 hours, so this should be called promptly
 * after receiving the video URL from the poll response.
 */
async function downloadVideo(
  videoUrl: string,
  outputDir: string,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): Promise<string> {
  const response = await fetchFn(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  await mkdir(outputDir, { recursive: true });

  // Derive filename from URL or fall back to timestamped name.
  const urlPath = videoUrl.split("?")[0];
  const urlName = basename(urlPath);
  const filename =
    urlName && urlName.includes(".") ? `happyhorse-${urlName}` : `happyhorse-${Date.now()}.mp4`;

  const localPath = join(outputDir, filename);
  await writeFile(localPath, buffer);

  return localPath;
}
