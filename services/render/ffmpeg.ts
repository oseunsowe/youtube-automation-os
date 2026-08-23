import path from "node:path";
import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import type { Scene } from "../common/types.js";

const WIDTH = 1920;
const HEIGHT = 1080;

function escapeDrawtext(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

export function buildImageSceneClipArgs(scene: Scene, outPath: string): string[] {
  const frames = Math.max(1, Math.round(scene.durationSeconds * 25));
  const isStatic = scene.motion === "static";
  const scaleFilter = isStatic
    ? `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT}`
    : `scale=${WIDTH * 1.15}:-1,zoompan=z='min(zoom+0.0007,1.15)':d=${frames}:s=${WIDTH}x${HEIGHT}`;
  return [
    "-y",
    "-loop", "1",
    "-i", scene.assetPath as string,
    "-i", scene.audioPath as string,
    "-t", String(scene.durationSeconds),
    "-vf", `${scaleFilter},format=yuv420p`,
    "-map", "0:v", "-map", "1:a",
    "-c:v", "libx264", "-c:a", "aac",
    "-shortest",
    outPath,
  ];
}

export function buildVideoSceneClipArgs(scene: Scene, outPath: string): string[] {
  return [
    "-y",
    "-i", scene.assetPath as string,
    "-i", scene.audioPath as string,
    "-t", String(scene.durationSeconds),
    "-vf", `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT}`,
    "-map", "0:v", "-map", "1:a",
    "-c:v", "libx264", "-c:a", "aac",
    "-shortest",
    outPath,
  ];
}

export function buildCardSceneClipArgs(scene: Scene, outPath: string): string[] {
  const text = escapeDrawtext(scene.overlayText ?? scene.narration);
  const bg = scene.visualType === "quote" ? "0x111318" : "0x0a0a0a";
  return [
    "-y",
    "-f", "lavfi",
    "-i", `color=c=${bg}:s=${WIDTH}x${HEIGHT}:d=${scene.durationSeconds}`,
    "-i", scene.audioPath as string,
    "-vf",
    `drawtext=text='${text}':fontcolor=white:fontsize=54:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.0`,
    "-map", "0:v", "-map", "1:a",
    "-c:v", "libx264", "-c:a", "aac",
    "-shortest",
    outPath,
  ];
}

const IMAGE_LIKE_TYPES = new Set(["image", "document", "screenshot"]);

export function buildSceneClipArgs(scene: Scene, outPath: string): string[] {
  if (scene.visualType === "stock_video" && scene.assetPath) {
    return buildVideoSceneClipArgs(scene, outPath);
  }
  if (IMAGE_LIKE_TYPES.has(scene.visualType) && scene.assetPath) {
    return buildImageSceneClipArgs(scene, outPath);
  }
  return buildCardSceneClipArgs(scene, outPath);
}

export function buildConcatFileContents(clipPaths: string[]): string {
  return clipPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n";
}

export function buildConcatArgs(concatListPath: string, outPath: string): string[] {
  return ["-y", "-f", "concat", "-safe", "0", "-i", concatListPath, "-c", "copy", outPath];
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args);
    let stderr = "";
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

/** Renders each scene (visual + its own narration audio) to a clip, then concatenates them into the final MP4. */
export async function renderWithFfmpeg(scenes: Scene[], workDir: string, outPath: string): Promise<string> {
  const clipPaths: string[] = [];
  for (const scene of scenes) {
    const clipPath = path.join(workDir, `${scene.id}.clip.mp4`);
    await runFfmpeg(buildSceneClipArgs(scene, clipPath));
    clipPaths.push(clipPath);
  }

  const concatListPath = path.join(workDir, "concat.txt");
  await writeFile(concatListPath, buildConcatFileContents(clipPaths));
  await runFfmpeg(buildConcatArgs(concatListPath, outPath));

  return outPath;
}
