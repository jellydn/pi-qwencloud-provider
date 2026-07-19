import { describe, it, expect, vi, beforeEach } from "vitest";
import { rm } from "node:fs/promises";

// Mock auth to prevent env API keys from leaking into tests.
vi.mock("../../src/auth.js", () => ({
  resolveApiKey: vi.fn().mockReturnValue(undefined),
  walkAuthPaths: vi.fn().mockReturnValue(undefined),
}));

import { generateWanImage, downloadWanImage, generateAndDownloadWanImage } from "../../src/wan.js";

type FetchFn = typeof globalThis.fetch;

function mockFetchFn(): ReturnType<
  typeof vi.fn<(...args: Parameters<FetchFn>) => ReturnType<FetchFn>>
> {
  return vi.fn<(...args: Parameters<FetchFn>) => ReturnType<FetchFn>>();
}

// ─── generateWanImage ──────────────────────────────────────────────────────

describe("generateWanImage", () => {
  let mockFetch: ReturnType<typeof mockFetchFn>;

  beforeEach(() => {
    mockFetch = mockFetchFn();
  });

  it("throws when no API key is available", async () => {
    await expect(generateWanImage("a cat", { apiKey: undefined })).rejects.toThrow(
      "No QwenCloud API key found",
    );
  });

  it("throws for unknown model", async () => {
    await expect(
      generateWanImage("a cat", {
        apiKey: "test-key",
        model: "unknown-model",
      }),
    ).rejects.toThrow("Unknown Wan model");
  });

  it("throws for unknown size", async () => {
    await expect(generateWanImage("a cat", { apiKey: "test-key", size: "8K" })).rejects.toThrow(
      "Unknown size",
    );
  });

  it("throws for invalid n", async () => {
    await expect(generateWanImage("a cat", { apiKey: "test-key", n: 0 })).rejects.toThrow(
      "n must be 1-4",
    );

    await expect(generateWanImage("a cat", { apiKey: "test-key", n: 5 })).rejects.toThrow(
      "n must be 1-4",
    );
  });

  it("throws on API error response", async () => {
    mockFetch.mockResolvedValue(
      new Response("Unauthorized", { status: 401 }) as unknown as Response,
    );
    await expect(
      generateWanImage("a cat", {
        apiKey: "test-key",
        fetch: mockFetch,
      }),
    ).rejects.toThrow("Wan API returned 401");
  });

  it("throws on network error (fetch rejection)", async () => {
    mockFetch.mockRejectedValue(new Error("connect ECONNREFUSED"));
    await expect(
      generateWanImage("a cat", {
        apiKey: "test-key",
        fetch: mockFetch,
      }),
    ).rejects.toThrow("connect ECONNREFUSED");
  });

  it("returns image URL on success", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          output: {
            choices: [
              {
                message: {
                  content: [
                    {
                      image: "https://oss.example.com/img.png",
                      type: "image",
                    },
                  ],
                  role: "assistant",
                },
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ) as unknown as Response,
    );

    const result = await generateWanImage("a cat", {
      apiKey: "test-key",
      fetch: mockFetch,
    });

    expect(result.url).toBe("https://oss.example.com/img.png");
    expect(result.model).toBe("wan2.7-image");
    expect(result.size).toBe("1K");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as Record<
      string,
      unknown
    >;
    expect(callBody.model).toBe("wan2.7-image");
    const input = callBody.input as Record<string, unknown>;
    const messages = input.messages as Array<Record<string, unknown>>;
    const content = messages[0].content as Array<Record<string, unknown>>;
    expect(content[0].text).toBe("a cat");
    const parameters = callBody.parameters as Record<string, unknown>;
    expect(parameters.size).toBe("1K");
    expect(parameters.n).toBe(1);
  });

  it("uses custom model and size from options", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          output: {
            choices: [
              {
                message: {
                  content: [{ image: "https://oss.example.com/img2.png" }],
                },
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ) as unknown as Response,
    );

    const result = await generateWanImage("a dog", {
      apiKey: "test-key",
      model: "wan2.7-image-pro",
      size: "2K",
      n: 2,
      fetch: mockFetch,
    });

    expect(result.model).toBe("wan2.7-image-pro");
    expect(result.size).toBe("2K");
    const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as Record<
      string,
      unknown
    >;
    expect(callBody.model).toBe("wan2.7-image-pro");
    const parameters = callBody.parameters as Record<string, unknown>;
    expect(parameters.size).toBe("2K");
    expect(parameters.n).toBe(2);
  });

  it("throws when response has no image URL", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ output: { choices: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }) as unknown as Response,
    );

    await expect(
      generateWanImage("a cat", {
        apiKey: "test-key",
        fetch: mockFetch,
      }),
    ).rejects.toThrow("Wan response has no images");
  });
});

// ─── downloadWanImage ──────────────────────────────────────────────────────

describe("downloadWanImage", () => {
  let mockFetch: ReturnType<typeof mockFetchFn>;

  beforeEach(() => {
    mockFetch = mockFetchFn();
  });

  it("downloads image and saves to outputDir", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic
    mockFetch.mockResolvedValue(new Response(pngBytes, { status: 200 }) as unknown as Response);

    const result = await downloadWanImage(
      {
        url: "https://oss.example.com/img.png",
        localPath: "",
        model: "wan2.7-image",
        size: "1K",
      },
      "/tmp/wan-test",
      mockFetch,
    );

    expect(result.localPath).toContain("/tmp/wan-test/wan-");
    expect(result.localPath).toContain(".png");
    expect(mockFetch).toHaveBeenCalledWith("https://oss.example.com/img.png");

    // Clean up
    await rm(result.localPath, { force: true });
  });

  it("throws on download failure", async () => {
    mockFetch.mockResolvedValue(new Response("Not Found", { status: 404 }) as unknown as Response);

    await expect(
      downloadWanImage(
        {
          url: "https://oss.example.com/expired.png",
          localPath: "",
          model: "wan2.7-image",
          size: "1K",
        },
        "/tmp/wan-test",
        mockFetch,
      ),
    ).rejects.toThrow("Failed to download image");
  });
});

// ─── generateAndDownloadWanImage (composition) ─────────────────────────────

describe("generateAndDownloadWanImage", () => {
  let mockFetch: ReturnType<typeof mockFetchFn>;

  beforeEach(() => {
    mockFetch = mockFetchFn();
  });

  it("generates and downloads in one call", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    // First call: API request
    // Second call: image download
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output: {
              choices: [
                {
                  message: {
                    content: [
                      {
                        image: "https://oss.example.com/img3.png",
                        type: "image",
                      },
                    ],
                  },
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ) as unknown as Response,
      )
      .mockResolvedValueOnce(new Response(pngBytes, { status: 200 }) as unknown as Response);

    const result = await generateAndDownloadWanImage("a sunset", "/tmp/wan-test", {
      apiKey: "test-key",
      fetch: mockFetch,
    });

    expect(result.url).toBe("https://oss.example.com/img3.png");
    expect(result.localPath).toContain("/tmp/wan-test/wan-");
    expect(result.localPath).toContain(".png");
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Clean up
    await rm(result.localPath, { force: true });
  });
});
