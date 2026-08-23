export interface StorageProvider {
  readonly name: string;
  /** Resolves a path within this storage backend from path segments (video id, "audio", filename, ...). */
  resolvePath(...segments: string[]): string;
}
