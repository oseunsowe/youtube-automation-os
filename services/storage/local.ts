import path from "node:path";
import type { StorageProvider } from "./provider.js";

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  private readonly rootDir: string;

  constructor(rootDir: string) {
    // Resolve to absolute up front: tools like ffmpeg's concat demuxer
    // resolve relative paths inside a list file relative to the list
    // file's own directory, not the process cwd, so a relative DATA_DIR
    // (the default is "./data") silently doubles up the path.
    this.rootDir = path.resolve(rootDir);
  }

  resolvePath(...segments: string[]): string {
    return path.join(this.rootDir, ...segments);
  }
}
