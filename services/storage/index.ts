import { env } from "../common/env.js";
import { LocalStorageProvider } from "./local.js";
import type { StorageProvider } from "./provider.js";

export type { StorageProvider } from "./provider.js";

export function getStorageProvider(providerName: string = env.storage.provider): StorageProvider {
  switch (providerName) {
    case "local":
      return new LocalStorageProvider(env.worker.dataDir);
    case "google_drive":
    case "r2":
    case "s3":
      throw new Error(
        `Storage provider "${providerName}" is not implemented in Phase 1 yet. Use "local".`,
      );
    default:
      throw new Error(`Unknown storage provider "${providerName}"`);
  }
}
