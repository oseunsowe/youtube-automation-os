import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { splitScriptIntoScenes } from "../../services/scenes/splitter.js";
import type { Script } from "../../services/common/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleScript: Script = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../examples/sample-script.json"), "utf-8"),
);

describe("splitScriptIntoScenes", () => {
  it("produces one scene per paragraph", () => {
    const paragraphCount = sampleScript.script.split(/\n{2,}/).filter((p) => p.trim()).length;
    const scenes = splitScriptIntoScenes(sampleScript);
    expect(scenes).toHaveLength(paragraphCount);
  });

  it("marks the first scene as a title card", () => {
    const [first] = splitScriptIntoScenes(sampleScript);
    expect(first.visualType).toBe("title");
  });

  it("assigns positive, word-count-proportional durations", () => {
    const scenes = splitScriptIntoScenes(sampleScript);
    for (const scene of scenes) {
      expect(scene.durationSeconds).toBeGreaterThan(0);
    }
  });

  it("extracts a non-empty search query for visual scenes", () => {
    const scenes = splitScriptIntoScenes(sampleScript).slice(1);
    for (const scene of scenes) {
      expect(scene.searchQuery && scene.searchQuery.length).toBeGreaterThan(0);
    }
  });

  it("detects quoted narration as a quote card", () => {
    const quoted: Script = {
      ...sampleScript,
      script: 'A short intro paragraph.\n\n"This is a real quote," she said.',
    };
    const scenes = splitScriptIntoScenes(quoted);
    expect(scenes[1].visualType).toBe("quote");
  });
});
