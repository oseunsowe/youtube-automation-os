import { describe, it, expect } from "vitest";
import { buildFfprobeArgs } from "../../services/voice/duration.js";

describe("buildFfprobeArgs", () => {
  it("builds args that ask ffprobe for a bare duration value", () => {
    const args = buildFfprobeArgs("/data/vid/audio/scene-01.mp3");
    expect(args).toEqual([
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      "/data/vid/audio/scene-01.mp3",
    ]);
  });
});
