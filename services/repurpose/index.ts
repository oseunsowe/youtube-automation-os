import path from "node:path";
import { mkdir } from "node:fs/promises";
import type { Scene, Short, SocialPlatform } from "../common/types.js";
import { selectClips, type SelectClipsOptions } from "./clipSelector.js";
import { renderVerticalClip } from "./verticalCrop.js";
import { postClip, type BlotatoOptions } from "../social/blotato.js";
import { getStorageProvider, type StorageProvider } from "../storage/index.js";

export { selectClips } from "./clipSelector.js";
export type { SelectClipsOptions } from "./clipSelector.js";

export interface GenerateShortsOptions {
  platforms: SocialPlatform[];
  /** Omit to render clips locally without posting anywhere. */
  blotato?: BlotatoOptions;
  clipOptions?: SelectClipsOptions;
}

export function resolveShortsOutDir(videoId: string, storage: StorageProvider = getStorageProvider()): string {
  return storage.resolvePath(videoId, "shorts");
}

/**
 * Selects clip candidates from a scene plan, crops each to 9:16 with a
 * burned-in caption, and (only if `blotato` options are given) posts each
 * to its target platform. Runs independently of the main pipeline -- see
 * n8n/14-social-repurpose.json (Update 12/8: repurposing is its own
 * subworkflow, never part of the automatic Start->Published path).
 */
export async function generateShorts(
  videoId: string,
  scenes: Scene[],
  renderPath: string,
  outDir: string,
  options: GenerateShortsOptions,
): Promise<Short[]> {
  await mkdir(outDir, { recursive: true });

  const clips = selectClips(scenes, options.clipOptions);
  const shorts: Short[] = [];

  for (const clip of clips) {
    for (const platform of options.platforms) {
      const shortId = `${videoId}-${clip.id}-${platform}`;
      const outPath = path.join(outDir, `${clip.id}-${platform}.mp4`);

      try {
        await renderVerticalClip(renderPath, clip.startSeconds, clip.endSeconds, clip.hook, outPath);

        let status: Short["status"] = "Ready";
        let publishedUrl: string | undefined;

        if (options.blotato) {
          try {
            const result = await postClip(outPath, platform, clip.hook, options.blotato);
            status = "Posted";
            publishedUrl = result.url;
          } catch (err) {
            console.warn(`[repurpose] Blotato post failed for ${shortId}: ${(err as Error).message}`);
          }
        }

        shorts.push({
          shortId,
          videoId,
          hook: clip.hook,
          sceneRange: clip.sceneRange,
          platform,
          caption: clip.hook,
          renderPath: outPath,
          status,
          publishedUrl,
        });
      } catch (err) {
        console.warn(`[repurpose] Failed to render clip ${shortId}: ${(err as Error).message}`);
        shorts.push({
          shortId,
          videoId,
          hook: clip.hook,
          sceneRange: clip.sceneRange,
          platform,
          caption: clip.hook,
          status: "Failed",
        });
      }
    }
  }

  return shorts;
}
