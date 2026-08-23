import { describe, it, expect } from "vitest";
import { buildRemotionRenderArgs } from "../../services/render/remotion.js";

describe("buildRemotionRenderArgs", () => {
  it("builds the expected remotion render CLI arguments", () => {
    const args = buildRemotionRenderArgs("/tmp/props.json", "/tmp/out.mp4");
    expect(args).toEqual([
      "remotion",
      "render",
      "src/index.ts",
      "Documentary",
      "/tmp/out.mp4",
      "--props=/tmp/props.json",
    ]);
  });
});
