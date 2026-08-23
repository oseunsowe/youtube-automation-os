import { describe, it, expect } from "vitest";
import { getVoiceProvider } from "../../services/voice/index.js";

describe("getVoiceProvider", () => {
  it("returns the edge-tts provider by default/for 'edge-tts'", () => {
    expect(getVoiceProvider("edge-tts").name).toBe("edge-tts");
  });

  it("throws a clear error for not-yet-implemented providers", () => {
    expect(() => getVoiceProvider("piper")).toThrow(/not implemented/);
    expect(() => getVoiceProvider("kokoro")).toThrow(/not implemented/);
    expect(() => getVoiceProvider("elevenlabs")).toThrow(/not implemented/);
  });

  it("throws on an unknown provider name", () => {
    expect(() => getVoiceProvider("nonsense")).toThrow(/Unknown voice provider/);
  });
});
