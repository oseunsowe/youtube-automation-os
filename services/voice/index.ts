import path from "node:path";
import { mkdir } from "node:fs/promises";
import type { Scene } from "../common/types.js";
import { synthesizeToFile } from "./edgeTts.js";
import { getAudioDurationSeconds } from "./duration.js";

export { buildFfprobeArgs, getAudioDurationSeconds } from "./duration.js";

/**
 * Synthesizes one narration audio clip per scene and returns updated scenes
 * with audioPath set and durationSeconds refined to the real clip length
 * (falls back to the script-estimated duration if ffprobe isn't available).
 */
export async function generateVoiceForScenes(
  scenes: Scene[],
  voice: string,
  outDir: string,
): Promise<Scene[]> {
  await mkdir(outDir, { recursive: true });

  const results: Scene[] = [];
  for (const scene of scenes) {
    const fileName = `${scene.id}.mp3`;
    const audioPath = await synthesizeToFile(scene.narration, voice, outDir, fileName);
    const realDuration = await getAudioDurationSeconds(audioPath);

    results.push({
      ...scene,
      audioPath,
      durationSeconds: realDuration ?? scene.durationSeconds,
    });
  }
  return results;
}

export function resolveVoiceOutDir(dataDir: string, videoId: string): string {
  return path.join(dataDir, videoId, "audio");
}
