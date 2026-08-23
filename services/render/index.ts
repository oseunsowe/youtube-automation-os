import path from "node:path";
import { mkdir } from "node:fs/promises";
import type { Scene } from "../common/types.js";
import { renderWithRemotion } from "./remotion.js";
import { renderWithFfmpeg } from "./ffmpeg.js";

export type RenderEngine = "remotion" | "ffmpeg";

export interface RenderResult {
  outPath: string;
  engine: RenderEngine;
}

/**
 * Renders the final MP4, preferring Remotion (richer scene components) and
 * automatically falling back to the plain FFmpeg pipeline if Remotion/Chromium
 * isn't available in the current environment (e.g. no Docker/Codespace).
 */
export async function renderVideo(
  scenes: Scene[],
  workDir: string,
  outPath: string,
  preferredEngine: RenderEngine = "remotion",
): Promise<RenderResult> {
  await mkdir(workDir, { recursive: true });
  await mkdir(path.dirname(outPath), { recursive: true });

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

export function resolveRenderPaths(dataDir: string, videoId: string) {
  return {
    workDir: path.join(dataDir, videoId, "render-work"),
    outPath: path.join(dataDir, videoId, "output", "final.mp4"),
  };
}
