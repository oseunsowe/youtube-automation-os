import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import path from "node:path";
import type { VoiceProvider } from "./provider.js";

export async function synthesizeToFile(
  text: string,
  voice: string,
  outDir: string,
  fileName: string,
): Promise<string> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioFilePath } = await tts.toFile(outDir, text);
  const target = path.join(outDir, fileName);
  if (audioFilePath !== target) {
    const fs = await import("node:fs/promises");
    await fs.rename(audioFilePath, target);
  }
  return target;
}

export class EdgeTtsProvider implements VoiceProvider {
  readonly name = "edge-tts";

  synthesizeToFile(text: string, voice: string, outDir: string, fileName: string): Promise<string> {
    return synthesizeToFile(text, voice, outDir, fileName);
  }
}
