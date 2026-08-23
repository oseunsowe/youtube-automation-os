import { describe, it, expect, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import { readFile, unlink } from "node:fs/promises";
import { ElevenLabsProvider } from "../../services/voice/elevenlabsProvider.js";

describe("ElevenLabsProvider", () => {
  it("throws without an API key", () => {
    expect(() => new ElevenLabsProvider("")).toThrow(/ELEVENLABS_API_KEY/);
  });

  it("posts text to the voice endpoint and writes the returned audio to disk", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode("fake-mp3-bytes").buffer,
    }) as unknown as typeof fetch;

    const provider = new ElevenLabsProvider("test-key", fetchImpl);
    const outDir = os.tmpdir();
    const fileName = `elevenlabs-test-${Date.now()}.mp3`;

    const target = await provider.synthesizeToFile("Hello world", "voice123", outDir, fileName);

    expect(target).toBe(path.join(outDir, fileName));
    const [url, options] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.elevenlabs.io/v1/text-to-speech/voice123");
    expect((options as RequestInit & { headers: Record<string, string> }).headers["xi-api-key"]).toBe("test-key");
    expect(JSON.parse(String((options as RequestInit).body)).text).toBe("Hello world");

    const written = await readFile(target, "utf-8");
    expect(written).toBe("fake-mp3-bytes");
    await unlink(target);
  });

  it("falls back to a default voice id when none is given", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    }) as unknown as typeof fetch;

    const provider = new ElevenLabsProvider("test-key", fetchImpl);
    const outDir = os.tmpdir();
    const fileName = `elevenlabs-default-${Date.now()}.mp3`;
    await provider.synthesizeToFile("Hi", "", outDir, fileName);

    const [url] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/text-to-speech/21m00Tcm4TlvDq8ikWAM");
    await unlink(path.join(outDir, fileName));
  });

  it("throws a descriptive error on a failed request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "invalid api key",
    }) as unknown as typeof fetch;

    const provider = new ElevenLabsProvider("bad-key", fetchImpl);
    await expect(provider.synthesizeToFile("Hi", "voice123", os.tmpdir(), "x.mp3")).rejects.toThrow(
      /ElevenLabs TTS request failed/,
    );
  });
});
