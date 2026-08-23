import { describe, it, expect } from "vitest";
import { scenesToMediaAssets } from "../../services/assets/index.js";
import type { Scene } from "../../services/common/types.js";

const baseScene: Scene = {
  id: "scene-01",
  index: 0,
  narration: "Some narration",
  durationSeconds: 5,
  visualType: "image",
};

describe("scenesToMediaAssets", () => {
  it("skips scenes without a downloaded asset", () => {
    expect(scenesToMediaAssets([baseScene], "vid1")).toEqual([]);
  });

  it("builds one ledger record per asset-backed scene", () => {
    const scene: Scene = {
      ...baseScene,
      assetPath: "/data/vid1/assets/scene-01.jpg",
      assetSourceUrl: "https://images.pexels.com/photo.jpg",
      assetProvider: "pexels",
      assetCredit: "Photo by Jane Doe on Pexels",
      assetLicense: "Pexels License (free, no attribution required)",
      assetUsageStatus: "approved",
    };

    const assets = scenesToMediaAssets([scene], "vid1");
    expect(assets).toHaveLength(1);
    expect(assets[0]).toEqual({
      assetId: "vid1-scene-01",
      sceneId: "scene-01",
      videoId: "vid1",
      sourceProvider: "pexels",
      sourceUrl: "https://images.pexels.com/photo.jpg",
      license: "Pexels License (free, no attribution required)",
      attribution: "Photo by Jane Doe on Pexels",
      downloadDate: assets[0].downloadDate,
      localPath: "/data/vid1/assets/scene-01.jpg",
      usageStatus: "approved",
    });
  });

  it("defaults usageStatus to review_required when the scene didn't set one", () => {
    const scene: Scene = {
      ...baseScene,
      assetPath: "/data/vid1/assets/scene-01.jpg",
      assetSourceUrl: "https://example.com/photo.jpg",
    };
    const [asset] = scenesToMediaAssets([scene], "vid1");
    expect(asset.usageStatus).toBe("review_required");
    expect(asset.license).toBe("Unknown -- requires manual license review");
  });
});
