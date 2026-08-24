import { spawn } from "node:child_process";

const VERTICAL_WIDTH = 1080;
const VERTICAL_HEIGHT = 1920;

function escapeDrawtext(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

/** Trims [startSeconds, endSeconds) from a landscape render, center-crops to 9:16, and burns in the hook as a caption. */
export function buildVerticalClipArgs(
  sourcePath: string,
  startSeconds: number,
  endSeconds: number,
  caption: string,
  outPath: string,
): string[] {
  const duration = endSeconds - startSeconds;
  const text = escapeDrawtext(caption);
  return [
    "-y",
    "-ss", String(startSeconds),
    "-i", sourcePath,
    "-t", String(duration),
    "-vf",
    `crop=ih*9/16:ih,scale=${VERTICAL_WIDTH}:${VERTICAL_HEIGHT},drawtext=text='${text}':fontcolor=white:fontsize=54:x=(w-text_w)/2:y=h-320:box=1:boxcolor=black@0.5:boxborderw=20`,
    "-c:v", "libx264",
    "-c:a", "aac",
    outPath,
  ];
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

export async function renderVerticalClip(
  sourcePath: string,
  startSeconds: number,
  endSeconds: number,
  caption: string,
  outPath: string,
): Promise<string> {
  await runFfmpeg(buildVerticalClipArgs(sourcePath, startSeconds, endSeconds, caption, outPath));
  return outPath;
}
