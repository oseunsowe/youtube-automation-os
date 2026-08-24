import { describe, it, expect } from "vitest";
import { buildVerticalClipArgs } from "../../services/repurpose/verticalCrop.js";

describe("buildVerticalClipArgs", () => {
  it("trims the source to [start, end) and crops/scales to 9:16", () => {
    const args = buildVerticalClipArgs("/data/vid/output/final.mp4", 30, 55, "A dramatic hook", "/out/clip.mp4");

    expect(args).toContain("-ss");
    expect(args).toContain("30");
    expect(args).toContain("-t");
    expect(args).toContain("25"); // 55 - 30
    expect(args).toContain("/data/vid/output/final.mp4");
    expect(args).toContain("/out/clip.mp4");
    const joined = args.join(" ");
    expect(joined).toContain("crop=ih*9/16:ih");
    expect(joined).toContain("scale=1080:1920");
    expect(joined).toContain("drawtext");
    expect(joined).toContain("A dramatic hook");
  });

  it("escapes colons in the caption for ffmpeg's drawtext filter", () => {
    const args = buildVerticalClipArgs("/src.mp4", 0, 10, "Time: 3:05 PM", "/out.mp4");
    expect(args.join(" ")).toContain("Time\\: 3\\:05 PM");
  });
});
