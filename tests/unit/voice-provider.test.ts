import { describe, it, expect } from "vitest";
import { getVoiceProvider } from "../../services/voice/index.js";

describe("getVoiceProvider", () => {
  it("returns the edge-tts provider by default/for 'edge-tts'", () => {
    expect(getVoiceProvider("edge-tts").name).toBe("edge-tts");
  });

  it("returns the elevenlabs provider only when explicitly requested, given a key", () => {
    expect(getVoiceProvider("elevenlabs", "test-key").name).toBe("elevenlabs");
  });

  it("elevenlabs requires an API key even when explicitly requested", () => {
    expect(() => getVoiceProvider("elevenlabs", "")).toThrow(/ELEVENLABS_API_KEY/);
  });

  it("throws a clear error for not-yet-implemented providers", () => {
    expect(() => getVoiceProvider("piper")).toThrow(/not implemented/);
    expect(() => getVoiceProvider("kokoro")).toThrow(/not implemented/);
  });

  it("throws on an unknown provider name", () => {
    expect(() => getVoiceProvider("nonsense")).toThrow(/Unknown voice provider/);
  });
});
