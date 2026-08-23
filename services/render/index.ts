import path from "node:path";
import { mkdir } from "node:fs/promises";
import type { Scene } from "../common/types.js";
import { renderWithRemotion } from "./remotion.js";
import { renderWithFfmpeg } from "./ffmpeg.js";
import { renderWithJson2Video } from "./json2video.js";
import { env } from "../common/env.js";
import { getStorageProvider, type StorageProvider } from "../storage/index.js";

export type RenderEngine = "remotion" | "ffmpeg" | "json2video";

export interface RenderResult {
  outPath: string;
  engine: RenderEngine;
}

/**
 * Renders the final MP4 via the configured RENDER_PROVIDER (Update 3).
 * "remotion" prefers Remotion's richer scene components and automatically
 * falls back to the plain FFmpeg pipeline if Remotion/Chromium isn't
 * available (e.g. no Docker/Codespace). "json2video" uses the same Scene
 * JSON against the JSON2Video API instead -- see services/render/json2video.ts.
 */
export async function renderVideo(
  scenes: Scene[],
  workDir: string,
  outPath: string,
  preferredEngine: RenderEngine = env.render.provider as RenderEngine,
): Promise<RenderResult> {
  await mkdir(workDir, { recursive: true });
  await mkdir(path.dirname(outPath), { recursive: true });

  if (preferredEngine === "json2video") {
    await renderWithJson2Video(scenes, outPath, { apiKey: env.render.json2videoApiKey });
    return { outPath, engine: "json2video" };
  }

  if (preferredEngine === "remotion") {
    try {
      await renderWithRemotion(scenes, workDir, outPath);
      return { outPath, engine: "remotion" };
    } catch (err) {
      console.warn(`[render] Remotion render failed, falling back to ffmpeg: ${(err as Error).message}`);
    }
  }

  await renderWithFfmpeg(scenes, workDir, outPath);
  return { outPath, engine: "ffmpeg" };
}

export function resolveRenderPaths(videoId: string, storage: StorageProvider = getStorageProvider()) {
  return {
    workDir: storage.resolvePath(videoId, "render-work"),
    outPath: storage.resolvePath(videoId, "output", "final.mp4"),
  };
}
