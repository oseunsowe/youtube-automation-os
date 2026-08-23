import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import path from "node:path";

/**
 * msedge-tts's exact method surface could not be verified against installed
 * types in this environment (no disk space for `npm install` locally) —
 * re-verify this call against node_modules/msedge-tts once installed in the
 * Codespace; see docs/TROUBLESHOOTING notes in QUICKSTART.md.
 */
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
