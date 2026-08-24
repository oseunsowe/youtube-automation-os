import { describe, it, expect, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import { writeFile, unlink } from "node:fs/promises";
import { uploadMedia, createPost, postClip } from "../../services/social/blotato.js";

const baseOptions = { apiKey: "test-key", baseUrl: "https://backend.blotato.com/v2" };

describe("uploadMedia", () => {
  it("uploads the file as multipart form data and returns the media url", async () => {
    const filePath = path.join(os.tmpdir(), `blotato-test-${Date.now()}.mp4`);
    await writeFile(filePath, "fake-clip-bytes");

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://cdn.blotato.com/media123.mp4" }),
      text: async () => "",
    }) as unknown as typeof fetch;

    const url = await uploadMedia(filePath, { ...baseOptions, fetchImpl });

    expect(url).toBe("https://cdn.blotato.com/media123.mp4");
    const [callUrl, options] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callUrl).toBe("https://backend.blotato.com/v2/media");
    expect((options as RequestInit & { headers: Record<string, string> }).headers.Authorization).toBe(
      "Bearer test-key",
    );

    await unlink(filePath);
  });

  it("throws a descriptive error on a failed upload", async () => {
    const filePath = path.join(os.tmpdir(), `blotato-test-${Date.now()}.mp4`);
    await writeFile(filePath, "x");
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "invalid key",
    }) as unknown as typeof fetch;

    await expect(uploadMedia(filePath, { ...baseOptions, fetchImpl })).rejects.toThrow(
      /Blotato media upload failed/,
    );
    await unlink(filePath);
  });
});

describe("createPost", () => {
  it("posts the media url, platform, and caption as JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "post123", url: "https://tiktok.com/@x/video/1" }),
      text: async () => "",
    }) as unknown as typeof fetch;

    const result = await createPost(
      "https://cdn.blotato.com/media123.mp4",
      "tiktok",
      "Check this out",
      { ...baseOptions, fetchImpl },
    );

    expect(result).toEqual({ postId: "post123", url: "https://tiktok.com/@x/video/1" });
    const [, options] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(String((options as RequestInit).body));
    expect(body).toEqual({
      platform: "tiktok",
      mediaUrl: "https://cdn.blotato.com/media123.mp4",
      caption: "Check this out",
    });
  });
});

describe("postClip", () => {
  it("uploads then creates a post in one call", async () => {
    const filePath = path.join(os.tmpdir(), `blotato-test-${Date.now()}.mp4`);
    await writeFile(filePath, "x");

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: "https://cdn.blotato.com/m.mp4" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "post1" }) });

    const result = await postClip(filePath, "youtube_shorts", "hook", {
      ...baseOptions,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.postId).toBe("post1");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await unlink(filePath);
  });
});
