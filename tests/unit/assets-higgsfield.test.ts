import { describe, it, expect, vi } from "vitest";
import { generateImage, generateVideo } from "../../services/assets/higgsfield.js";

const baseOptions = { apiKey: "test-key", baseUrl: "https://api.higgsfield.ai/v1", pollIntervalMs: 0 };

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
      { id: "job1" },
      { status: "processing" },
      { status: "completed", outputUrl: "https://cdn.higgsfield.ai/img1.png" },
    );

    const result = await generateImage("a foggy harbor at dawn", { ...baseOptions, fetchImpl });

    expect(result).toEqual({
      provider: "higgsfield",
      url: "https://cdn.higgsfield.ai/img1.png",
      credit: "AI-generated image via Higgsfield",
    });

    const [submitUrl, submitOptions] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(submitUrl).toBe("https://api.higgsfield.ai/v1/images/generate");
    expect(JSON.parse(String((submitOptions as RequestInit).body))).toEqual({ prompt: "a foggy harbor at dawn" });
  });

  it("throws if the job fails", async () => {
    const fetchImpl = mockSequence({ id: "job1" }, { status: "failed" });
    await expect(generateImage("x", { ...baseOptions, fetchImpl })).rejects.toThrow(/failed/);
  });

  it("throws if polling exceeds the attempt budget", async () => {
    const fetchImpl = mockSequence({ id: "job1" }, { status: "pending" }, { status: "pending" });
    await expect(
      generateImage("x", { ...baseOptions, fetchImpl, maxPollAttempts: 2 }),
    ).rejects.toThrow(/did not finish within the poll budget/);
  });
});

describe("generateVideo", () => {
  it("posts to the videos endpoint", async () => {
    const fetchImpl = mockSequence(
      { jobId: "job2" },
      { status: "completed", outputUrl: "https://cdn.higgsfield.ai/vid1.mp4" },
    );

    const result = await generateVideo("a slow pan over city lights", { ...baseOptions, fetchImpl });
    expect(result.url).toBe("https://cdn.higgsfield.ai/vid1.mp4");
    expect(result.provider).toBe("higgsfield");

    const [submitUrl] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(submitUrl).toBe("https://api.higgsfield.ai/v1/videos/generate");
  });
});
