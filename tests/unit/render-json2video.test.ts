import { describe, it, expect, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import { unlink } from "node:fs/promises";
import {
  scenesToMovieDefinition,
  createMovie,
  pollMovieStatus,
  renderWithJson2Video,
} from "../../services/render/json2video.js";
import type { Scene } from "../../services/common/types.js";

const videoScene: Scene = {
  id: "scene-01",
  index: 0,
  narration: "Some narration",
  durationSeconds: 5,
  visualType: "stock_video",
  assetPath: "/data/vid/assets/scene-01.mp4",
  audioPath: "/data/vid/audio/scene-01.mp3",
};

const cardScene: Scene = {
  id: "scene-02",
  index: 1,
  narration: "A title card",
  durationSeconds: 4,
  visualType: "title",
  audioPath: "/data/vid/audio/scene-02.mp3",
};

describe("scenesToMovieDefinition", () => {
  it("maps a stock_video scene to a video element plus an audio element", () => {
    const movie = scenesToMovieDefinition([videoScene]);
    expect(movie.scenes).toHaveLength(1);
    const elements = movie.scenes[0].elements;
    expect(elements).toContainEqual({ type: "video", src: videoScene.assetPath, duration: 5 });
    expect(elements).toContainEqual({ type: "audio", src: videoScene.audioPath });
  });

  it("maps an asset-less scene (title/quote) to a text element", () => {
    const movie = scenesToMovieDefinition([cardScene]);
    const elements = movie.scenes[0].elements;
    expect(elements).toContainEqual({ type: "text", text: "A title card", duration: 4 });
  });

  it("defaults to 1920x1080", () => {
    const movie = scenesToMovieDefinition([videoScene]);
    expect(movie.width).toBe(1920);
    expect(movie.height).toBe(1080);
  });
});

describe("createMovie / pollMovieStatus", () => {
  it("posts the movie definition and returns the project id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, project: "proj123" }),
      text: async () => "",
    }) as unknown as typeof fetch;

    const projectId = await createMovie(scenesToMovieDefinition([videoScene]), "api-key", fetchImpl);
    expect(projectId).toBe("proj123");
    const [url, options] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.json2video.com/v2/movies");
    expect((options as RequestInit & { headers: Record<string, string> }).headers["x-api-key"]).toBe("api-key");
  });

  it("polls status and returns it", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ movie: { status: "done", url: "https://cdn.example/out.mp4" } }),
      text: async () => "",
    }) as unknown as typeof fetch;

    const status = await pollMovieStatus("proj123", "api-key", fetchImpl);
    expect(status).toEqual({ status: "done", url: "https://cdn.example/out.mp4" });
  });
});

describe("renderWithJson2Video", () => {
  it("creates, polls until done, downloads the output, and writes it to outPath", async () => {
    const outPath = path.join(os.tmpdir(), `json2video-test-${Date.now()}.mp4`);

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ project: "proj123" }), text: async () => "" })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ movie: { status: "running" } }),
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ movie: { status: "done", url: "https://cdn.example/out.mp4" } }),
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      }) as unknown as typeof fetch;

    const result = await renderWithJson2Video([videoScene], outPath, {
      apiKey: "api-key",
      fetchImpl,
      pollIntervalMs: 0,
      maxPollAttempts: 5,
    });

    expect(result).toBe(outPath);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    await unlink(outPath).catch(() => {});
  });

  it("throws if the render errors out on JSON2Video's side", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ project: "proj123" }), text: async () => "" })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ movie: { status: "error" } }),
        text: async () => "",
      }) as unknown as typeof fetch;

    await expect(
      renderWithJson2Video([videoScene], "/tmp/out.mp4", {
        apiKey: "api-key",
        fetchImpl,
        pollIntervalMs: 0,
        maxPollAttempts: 5,
      }),
    ).rejects.toThrow(/JSON2Video render failed/);
  });
});
