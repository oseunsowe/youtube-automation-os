import { spawn } from "node:child_process";

export function buildFfprobeArgs(filePath: string): string[] {
  return [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath,
  ];
}

/** Returns the audio duration in seconds via ffprobe, or null if ffprobe is unavailable. */
export async function getAudioDurationSeconds(filePath: string): Promise<number | null> {
  return new Promise((resolve) => {
    const proc = spawn("ffprobe", buildFfprobeArgs(filePath));
    let stdout = "";
    proc.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    proc.on("error", () => resolve(null));
    proc.on("close", (code) => {
      if (code !== 0) return resolve(null);
      const seconds = Number.parseFloat(stdout.trim());
      resolve(Number.isFinite(seconds) ? seconds : null);
    });
  });
}
