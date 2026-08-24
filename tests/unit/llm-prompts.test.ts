import { describe, it, expect } from "vitest";
import { loadSharedPrompt, loadCategoryPrompt } from "../../services/llm/prompts.js";
import { CATEGORIES } from "../../services/common/types.js";

describe("prompt files", () => {
  it("loads the shared documentary-script-writer prompt", () => {
    const prompt = loadSharedPrompt();
    expect(prompt.length).toBeGreaterThan(100);
  });

  for (const category of CATEGORIES) {
    it(`loads the ${category} category prompt`, () => {
      const prompt = loadCategoryPrompt(category);
      expect(prompt.length).toBeGreaterThan(20);
    });
  }
});
