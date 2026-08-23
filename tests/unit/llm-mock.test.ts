import { describe, it, expect } from "vitest";
import { MockLLMProvider } from "../../services/llm/mock.js";

describe("MockLLMProvider", () => {
  const provider = new MockLLMProvider();

  it("generates a script with 8 beats/chapters", async () => {
    const script = await provider.generateScript({
      title: "The Collapse of Example Corp",
      category: "dark-business",
      runtimeMinutes: 5,
    });
    expect(script.chapters).toHaveLength(8);
  });

  it("targets roughly 150 words per minute of runtime", async () => {
    const script = await provider.generateScript({
      title: "Test Title",
      category: "history",
      runtimeMinutes: 4,
    });
    expect(script.wordCount).toBeGreaterThan(400);
    expect(script.wordCount).toBeLessThan(800);
  });

  it("is deterministic for the same input", async () => {
    const request = { title: "Repeatable", category: "ai-tech" as const, runtimeMinutes: 2 };
    const a = await provider.generateScript(request);
    const b = await provider.generateScript(request);
    expect(a).toEqual(b);
  });

  it("produces paragraphs separated by blank lines that scene-splitting can consume", async () => {
    const script = await provider.generateScript({
      title: "Paragraph Test",
      category: "mysteries",
      runtimeMinutes: 1,
    });
    expect(script.script.split(/\n{2,}/).length).toBe(8);
  });
});
