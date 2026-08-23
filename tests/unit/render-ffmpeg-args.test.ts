import { describe, it, expect } from "vitest";
import {
  buildImageSceneClipArgs,
  buildVideoSceneClipArgs,
  buildCardSceneClipArgs,
  buildSceneClipArgs,
  buildConcatFileContents,
  buildConcatArgs,
} from "../../services/render/ffmpeg.js";
import type { Scene } from "../../services/common/types.js";

const baseScene: Scene = {
  id: "scene-01",
  index: 0,
  narration: "Some narration text",
  durationSeconds: 6,
  visualType: "image",
  assetPath: "/data/vid/assets/scene-01.jpg",
  audioPath: "/data/vid/audio/scene-01.mp3",
};

describe("ffmpeg arg builders", () => {
  it("builds a zoompan image clip command using the scene's asset and audio", () => {
    const args = buildImageSceneClipArgs(baseScene, "/out/scene-01.clip.mp4");
    expect(args).toContain("/data/vid/assets/scene-01.jpg");
    expect(args).toContain("/data/vid/audio/scene-01.mp3");
    expect(args).toContain("/out/scene-01.clip.mp4");
    expect(args).toContain("-shortest");
  });

  it("builds a scaled/cropped video clip command", () => {
    const scene: Scene = { ...baseScene, visualType: "stock_video", assetPath: "/data/vid/assets/scene-01.mp4" };
    const args = buildVideoSceneClipArgs(scene, "/out/scene-01.clip.mp4");
    expect(args).toContain("/data/vid/assets/scene-01.mp4");
    expect(args.join(" ")).toContain("crop=1920:1080");
  });

  it("builds a text-card clip for title/quote scenes without an asset", () => {
    const scene: Scene = { ...baseScene, visualType: "quote", assetPath: undefined, overlayText: "A quote: with colons" };
    const args = buildCardSceneClipArgs(scene, "/out/scene-01.clip.mp4");
    const joined = args.join(" ");
    expect(joined).toContain("drawtext");
    // colons in the overlay text must be escaped for ffmpeg's drawtext filter
    expect(joined).toContain("A quote\\: with colons");
  });

  it("dispatches to the card builder when a visual scene has no asset yet", () => {
    const scene: Scene = { ...baseScene, assetPath: undefined };
    const args = buildSceneClipArgs(scene, "/out/scene-01.clip.mp4");
    expect(args.join(" ")).toContain("drawtext");
  });

  it("builds a valid concat demuxer file listing every clip", () => {
    const contents = buildConcatFileContents(["/out/a.mp4", "/out/b.mp4"]);
    expect(contents).toBe("file '/out/a.mp4'\nfile '/out/b.mp4'\n");
  });

  it("builds concat args that copy streams without re-encoding", () => {
    const args = buildConcatArgs("/out/concat.txt", "/out/final.mp4");
    expect(args).toEqual(["-y", "-f", "concat", "-safe", "0", "-i", "/out/concat.txt", "-c", "copy", "/out/final.mp4"]);
  });
});
