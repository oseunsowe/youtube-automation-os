import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { splitScriptIntoScenes } from "../../services/scenes/splitter.js";
import type { Script, VisualPriorities } from "../../services/common/types.js";
import { DEFAULT_VISUAL_PRIORITIES } from "../../services/common/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleScript: Script = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../examples/sample-script.json"), "utf-8"),
);

describe("splitScriptIntoScenes", () => {
  it("targets roughly runtime / average-scene-duration scenes, not one per paragraph", () => {
    const scenes = splitScriptIntoScenes(sampleScript, { sceneDensity: "medium" });
    // sampleScript.estimatedRuntimeSeconds is 80s; medium density averages 8s/scene -> ~10 scenes.
    expect(scenes.length).toBeGreaterThanOrEqual(7);
    expect(scenes.length).toBeLessThanOrEqual(13);
  });

  it("produces more, shorter scenes at high density than at low density", () => {
    const high = splitScriptIntoScenes(sampleScript, { sceneDensity: "high" });
    const low = splitScriptIntoScenes(sampleScript, { sceneDensity: "low" });
    expect(high.length).toBeGreaterThan(low.length);
  });

  it("respects an explicit averageSceneDurationSeconds override", () => {
    const scenes = splitScriptIntoScenes(sampleScript, { averageSceneDurationSeconds: 40 });
    expect(scenes.length).toBeLessThanOrEqual(3);
  });

  it("marks the first scene as a title card", () => {
    const [first] = splitScriptIntoScenes(sampleScript);
    expect(first.visualType).toBe("title");
  });

  it("assigns positive durations and a non-empty search query to every scene", () => {
    const scenes = splitScriptIntoScenes(sampleScript);
    for (const scene of scenes) {
      expect(scene.durationSeconds).toBeGreaterThan(0);
      expect(scene.searchQuery && scene.searchQuery.length).toBeGreaterThan(0);
    }
  });

  it("detects quoted narration as a quote card", () => {
    const quoted: Script = {
      ...sampleScript,
      script: 'A short intro sentence. "This is a real quote," she said. A closing sentence.',
      estimatedRuntimeSeconds: 20,
    };
    const scenes = splitScriptIntoScenes(quoted, { averageSceneDurationSeconds: 5 });
    expect(scenes.some((s) => s.visualType === "quote")).toBe(true);
  });

  it("routes visuals through the enabled priority rotation only", () => {
    const priorities: VisualPriorities = {
      ...DEFAULT_VISUAL_PRIORITIES,
      stockFootage: false,
      archive: false,
      document: true,
    };
    const scenes = splitScriptIntoScenes(sampleScript, { visualPriorities: priorities });
    const nonTitleTypes = new Set(scenes.slice(1).map((s) => s.visualType));
    for (const type of nonTitleTypes) {
      expect(["document", "quote"]).toContain(type);
    }
  });

  it("falls back to image/stock_video when no priorities are enabled", () => {
    const priorities: VisualPriorities = {
      stockFootage: false,
      archive: false,
      map: false,
      document: false,
      chart: false,
      screenshot: false,
      aiImage: false,
      aiVideo: false,
    };
    const scenes = splitScriptIntoScenes(sampleScript, { visualPriorities: priorities });
    const nonTitleTypes = new Set(scenes.slice(1).map((s) => s.visualType));
    for (const type of nonTitleTypes) {
      expect(["image", "stock_video", "quote"]).toContain(type);
    }
  });

  it("returns an empty array for an empty script", () => {
    const empty: Script = { ...sampleScript, script: "   " };
    expect(splitScriptIntoScenes(empty)).toEqual([]);
  });
});
