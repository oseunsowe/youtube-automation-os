import { mkdir } from "node:fs/promises";
import type { Scene } from "../common/types.js";
import type { VoiceProvider } from "./provider.js";
import { EdgeTtsProvider } from "./edgeTts.js";
import { ElevenLabsProvider } from "./elevenlabsProvider.js";
import { getAudioDurationSeconds } from "./duration.js";
import { env } from "../common/env.js";
import { getStorageProvider, type StorageProvider } from "../storage/index.js";

export type { VoiceProvider } from "./provider.js";
export { buildFfprobeArgs, getAudioDurationSeconds } from "./duration.js";
export { ElevenLabsProvider } from "./elevenlabsProvider.js";

/**
 * Defaults to edge-tts (free, no key) unless a job explicitly asks for
 * something else -- elevenlabs is a paid provider, so it's only ever used
 * when a caller passes providerName="elevenlabs" (per-job "Voice Provider"
 * field), never picked automatically.
 */
export function getVoiceProvider(
  providerName: string = env.tts.provider,
  elevenlabsApiKey: string = env.tts.elevenlabsApiKey,
): VoiceProvider {
  switch (providerName) {
    case "edge-tts":
      return new EdgeTtsProvider();
    case "elevenlabs":
      return new ElevenLabsProvider(elevenlabsApiKey);
    case "piper":
    case "kokoro":
      throw new Error(
        `Voice provider "${providerName}" is not implemented in Phase 1 yet. Use "edge-tts" or "elevenlabs".`,
      );
    default:
      throw new Error(`Unknown voice provider "${providerName}"`);
  }
}

/**
 * Synthesizes one narration audio clip per scene and returns updated scenes
 * with audioPath set and durationSeconds refined to the real clip length
 * (falls back to the script-estimated duration if ffprobe isn't available).
 */
export async function generateVoiceForScenes(
  scenes: Scene[],
  voice: string,
  outDir: string,
  provider: VoiceProvider = getVoiceProvider(),
): Promise<Scene[]> {
  await mkdir(outDir, { recursive: true });

  const results: Scene[] = [];
  for (const scene of scenes) {
    const fileName = `${scene.id}.mp3`;
    const audioPath = await provider.synthesizeToFile(scene.narration, voice, outDir, fileName);
    const realDuration = await getAudioDurationSeconds(audioPath);

    results.push({
      ...scene,
      audioPath,
      durationSeconds: realDuration ?? scene.durationSeconds,
    });
  }
  return results;
}

export function resolveVoiceOutDir(videoId: string, storage: StorageProvider = getStorageProvider()): string {
  return storage.resolvePath(videoId, "audio");
}
