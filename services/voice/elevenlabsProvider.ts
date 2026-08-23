import path from "node:path";
import { writeFile } from "node:fs/promises";
import type { VoiceProvider } from "./provider.js";

const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
// ElevenLabs' well-known default "Rachel" voice, used only if the job
// doesn't specify one -- for real use, set the Airtable "Voice" field to a
// real ElevenLabs voice ID (these look nothing like edge-tts voice names).
const FALLBACK_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export class ElevenLabsProvider implements VoiceProvider {
  readonly name = "elevenlabs";

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is required to use the elevenlabs voice provider");
    }
  }

  async synthesizeToFile(text: string, voice: string, outDir: string, fileName: string): Promise<string> {
    const voiceId = voice || FALLBACK_VOICE_ID;

    const res = await this.fetchImpl(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text, model_id: DEFAULT_MODEL_ID }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`ElevenLabs TTS request failed: ${res.status} ${body}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const target = path.join(outDir, fileName);
    await writeFile(target, buffer);
    return target;
  }
}
