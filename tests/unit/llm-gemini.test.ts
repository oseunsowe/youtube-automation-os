import { describe, it, expect, vi } from "vitest";
import { GeminiLLMProvider } from "../../services/llm/gemini.js";

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as typeof fetch;
}

describe("GeminiLLMProvider", () => {
  it("throws without an API key", () => {
    expect(() => new GeminiLLMProvider("")).toThrow(/GEMINI_API_KEY/);
  });

  it("calls the Gemini REST endpoint with the API key and parses the response", async () => {
    const fetchImpl = mockFetch({
      candidates: [
        {
          content: {
            parts: [{ text: "Paragraph one about the topic.\n\nParagraph two with more detail." }],
          },
        },
      ],
    });

    const provider = new GeminiLLMProvider("test-key", "gemini-2.0-flash", fetchImpl);
    const script = await provider.generateScript({
      title: "Test",
      category: "history",
      runtimeMinutes: 1,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("key=test-key");
    expect(url).toContain("gemini-2.0-flash");

    expect(script.hook).toBe("Paragraph one about the topic.");
    expect(script.chapters).toHaveLength(2);
    expect(script.wordCount).toBeGreaterThan(0);
  });

  it("throws a descriptive error on a non-OK response", async () => {
    const fetchImpl = mockFetch({ error: "bad request" }, false, 400);
    const provider = new GeminiLLMProvider("test-key", "gemini-2.0-flash", fetchImpl);
    await expect(
      provider.generateScript({ title: "Test", category: "history", runtimeMinutes: 1 }),
    ).rejects.toThrow(/Gemini request failed/);
  });

  it("throws when Gemini returns no text", async () => {
    const fetchImpl = mockFetch({ candidates: [] });
    const provider = new GeminiLLMProvider("test-key", "gemini-2.0-flash", fetchImpl);
    await expect(
      provider.generateScript({ title: "Test", category: "history", runtimeMinutes: 1 }),
    ).rejects.toThrow(/empty script/);
  });
});
