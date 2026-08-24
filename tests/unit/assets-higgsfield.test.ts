import { describe, it, expect, vi } from "vitest";
import { generateImage, generateVideo } from "../../services/assets/higgsfield.js";

const baseOptions = {
  apiKeyId: "test-id",
  apiKeySecret: "test-secret",
  baseUrl: "https://platform.higgsfield.ai",
  pollIntervalMs: 0,
};

function mockSequence(...responses: unknown[]) {
  const fn = vi.fn();
  for (const body of responses) {
    fn.mockResolvedValueOnce({ ok: true, json: async () => body, text: async () => "" });
  }
  return fn as unknown as typeof fetch;
}

describe("generateImage", () => {
  it("submits a job then polls until completed, returning the output url", async () => {
    const fetchImpl = mockSequence(
      { status: "queued", request_id: "req1" },
      { status: "in_progress", request_id: "req1" },
      { status: "completed", request_id: "req1", images: [{ url: "https://cdn.higgsfield.ai/img1.png" }] },
    );

    const result = await generateImage("a foggy harbor at dawn", { ...baseOptions, fetchImpl });

    expect(result).toEqual({
      provider: "higgsfield",
      url: "https://cdn.higgsfield.ai/img1.png",
      credit: "AI-generated image via Higgsfield",
    });

    const [submitUrl, submitOptions] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(submitUrl).toBe("https://platform.higgsfield.ai/higgsfield-ai/soul/standard");
    expect((submitOptions as RequestInit & { headers: Record<string, string> }).headers.Authorization).toBe(
      "Key test-id:test-secret",
    );
    expect(JSON.parse(String((submitOptions as RequestInit).body))).toEqual({
      prompt: "a foggy harbor at dawn",
      aspect_ratio: "16:9",
      resolution: "720p",
    });

    const [statusUrl] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(statusUrl).toBe("https://platform.higgsfield.ai/requests/req1/status");
  });

  it("throws if the job fails", async () => {
    const fetchImpl = mockSequence(
      { status: "queued", request_id: "req1" },
      { status: "failed", request_id: "req1", error: "prompt rejected" },
    );
    await expect(generateImage("x", { ...baseOptions, fetchImpl })).rejects.toThrow(/failed/);
  });

  it("throws if polling exceeds the attempt budget", async () => {
    const fetchImpl = mockSequence(
      { status: "queued", request_id: "req1" },
      { status: "in_progress", request_id: "req1" },
      { status: "in_progress", request_id: "req1" },
    );
    await expect(
      generateImage("x", { ...baseOptions, fetchImpl, maxPollAttempts: 2 }),
    ).rejects.toThrow(/did not finish within the poll budget/);
  });
});

describe("generateVideo", () => {
  it("chains an image job into the image-to-video endpoint (Higgsfield has no text-to-video endpoint)", async () => {
    const fetchImpl = mockSequence(
      // image generation
      { status: "queued", request_id: "img-req" },
      { status: "completed", request_id: "img-req", images: [{ url: "https://cdn.higgsfield.ai/still.png" }] },
      // video generation, animating that still
      { status: "queued", request_id: "vid-req" },
      { status: "completed", request_id: "vid-req", video: { url: "https://cdn.higgsfield.ai/vid1.mp4" } },
    );

    const result = await generateVideo("a slow pan over city lights", { ...baseOptions, fetchImpl });
    expect(result.url).toBe("https://cdn.higgsfield.ai/vid1.mp4");
    expect(result.provider).toBe("higgsfield");

    const calls = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe("https://platform.higgsfield.ai/higgsfield-ai/soul/standard");
    expect(calls[2][0]).toBe("https://platform.higgsfield.ai/higgsfield-ai/dop/standard");
    expect(JSON.parse(String((calls[2][1] as RequestInit).body))).toEqual({
      image_url: "https://cdn.higgsfield.ai/still.png",
      prompt: "a slow pan over city lights",
    });
  });
});
