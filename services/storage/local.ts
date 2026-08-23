import path from "node:path";
import type { StorageProvider } from "./provider.js";

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";

  constructor(private readonly rootDir: string) {}

  resolvePath(...segments: string[]): string {
    return path.join(this.rootDir, ...segments);
  }
}
