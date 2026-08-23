import { describe, it, expect } from "vitest";
import path from "node:path";
import { LocalStorageProvider } from "../../services/storage/local.js";
import { getStorageProvider } from "../../services/storage/index.js";

describe("LocalStorageProvider", () => {
  it("joins segments under the configured root directory", () => {
    const storage = new LocalStorageProvider("/data");
    expect(storage.resolvePath("video1", "audio", "scene-01.mp3")).toBe(
      path.join("/data", "video1", "audio", "scene-01.mp3"),
    );
  });
});

describe("getStorageProvider", () => {
  it("returns a LocalStorageProvider for 'local'", () => {
    const provider = getStorageProvider("local");
    expect(provider.name).toBe("local");
  });

  it("throws a clear error for not-yet-implemented providers", () => {
    expect(() => getStorageProvider("s3")).toThrow(/not implemented/);
    expect(() => getStorageProvider("google_drive")).toThrow(/not implemented/);
    expect(() => getStorageProvider("r2")).toThrow(/not implemented/);
  });

  it("throws on an unknown provider name", () => {
    expect(() => getStorageProvider("nonsense")).toThrow(/Unknown storage provider/);
  });
});
