import { describe, it, expect } from "vitest";
import { selectClips } from "../../services/repurpose/clipSelector.js";
import type { Scene } from "../../services/common/types.js";

function scene(overrides: Partial<Scene> & { id: string; index: number }): Scene {
  return {
    narration: `Narration for ${overrides.id}`,
    durationSeconds: 10,
    visualType: "image",
    ...overrides,
  };
}

describe("selectClips", () => {
  it("returns no clips for an empty scene list", () => {
    expect(selectClips([])).toEqual([]);
  });

  it("anchors on the opening scene and any quote scenes, without overlap", () => {
    const scenes: Scene[] = [
      scene({ id: "scene-01", index: 0, visualType: "title" }),
      scene({ id: "scene-02", index: 1, visualType: "image" }),
      scene({ id: "scene-03", index: 2, visualType: "quote" }),
      scene({ id: "scene-04", index: 3, visualType: "stock_video" }),
    ];

    const clips = selectClips(scenes, { maxClips: 2, minClipSeconds: 10, maxClipSeconds: 20 });

    expect(clips).toHaveLength(2);
    expect(clips[0]).toMatchObject({ startSeconds: 0, endSeconds: 10, sceneRange: "scene-01" });
    expect(clips[1]).toMatchObject({ startSeconds: 20, endSeconds: 30, sceneRange: "scene-03" });
  });

  it("grows a window across multiple scenes to reach the minimum clip length", () => {
    const scenes: Scene[] = [
      scene({ id: "scene-01", index: 0, durationSeconds: 5 }),
      scene({ id: "scene-02", index: 1, durationSeconds: 5 }),
      scene({ id: "scene-03", index: 2, durationSeconds: 5 }),
    ];

    const [clip] = selectClips(scenes, { maxClips: 1, minClipSeconds: 12, maxClipSeconds: 30 });

    expect(clip.startSeconds).toBe(0);
    expect(clip.endSeconds).toBe(15); // pulls in all 3 scenes to clear the 12s minimum
    expect(clip.sceneRange).toBe("scene-01..scene-03");
  });

  it("never returns more clips than maxClips", () => {
    const scenes: Scene[] = Array.from({ length: 20 }, (_, i) =>
      scene({ id: `scene-${i + 1}`, index: i, durationSeconds: 3 }),
    );

    const clips = selectClips(scenes, { maxClips: 3 });
    expect(clips.length).toBeLessThanOrEqual(3);
  });

  it("never returns overlapping clips", () => {
    const scenes: Scene[] = Array.from({ length: 12 }, (_, i) =>
      scene({ id: `scene-${i + 1}`, index: i, durationSeconds: 4, visualType: i % 3 === 0 ? "quote" : "image" }),
    );

    const clips = selectClips(scenes, { maxClips: 5, minClipSeconds: 8, maxClipSeconds: 16 });
    const sorted = [...clips].sort((a, b) => a.startSeconds - b.startSeconds);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].startSeconds).toBeGreaterThanOrEqual(sorted[i - 1].endSeconds);
    }
  });

  it("uses overlayText as the hook when present, else the narration", () => {
    const scenes: Scene[] = [
      scene({ id: "scene-01", index: 0, narration: "long narration text", overlayText: "Short hook" }),
    ];
    const [clip] = selectClips(scenes, { maxClips: 1 });
    expect(clip.hook).toBe("Short hook");
  });
});
