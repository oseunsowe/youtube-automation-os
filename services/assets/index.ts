import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { MediaAsset, Scene } from "../common/types.js";
import { searchPexelsPhoto, searchPexelsVideo, type AssetResult } from "./pexels.js";
import { searchPixabayPhoto, searchPixabayVideo } from "./pixabay.js";
import { getStorageProvider, type StorageProvider } from "../storage/index.js";

export type { AssetResult } from "./pexels.js";

export interface AssetProviderKeys {
  pexelsApiKey: string;
  pixabayApiKey: string;
}

const KNOWN_LICENSES: Record<string, string> = {
  pexels: "Pexels License (free, no attribution required)",
  pixabay: "Pixabay License (free, no attribution required)",
};

/** Visual types that need a downloaded still/video asset rather than a rendered text card. */
const ASSET_BACKED_TYPES = new Set(["stock_video", "image", "document", "screenshot"]);

async function findAsset(
  query: string,
  wantsVideo: boolean,
  keys: AssetProviderKeys,
): Promise<AssetResult | null> {
  if (wantsVideo) {
    return (
      (await searchPexelsVideo(query, keys.pexelsApiKey)) ??
      (await searchPixabayVideo(query, keys.pixabayApiKey))
    );
  }
  return (
    (await searchPexelsPhoto(query, keys.pexelsApiKey)) ??
    (await searchPixabayPhoto(query, keys.pixabayApiKey))
  );
}

async function downloadTo(url: string, filePath: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Failed to download asset: ${res.status} ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(filePath, buffer);
}

/** Attaches a downloaded stock asset to every image/stock_video scene; title/quote scenes are left as-is. */
export async function attachAssetsToScenes(
  scenes: Scene[],
  keys: AssetProviderKeys,
  outDir: string,
): Promise<Scene[]> {
  await mkdir(outDir, { recursive: true });

  const results: Scene[] = [];
  for (const scene of scenes) {
    if (!ASSET_BACKED_TYPES.has(scene.visualType)) {
      results.push(scene);
      continue;
    }

    const query = scene.searchQuery || scene.narration.slice(0, 40);
    const wantsVideo = scene.visualType === "stock_video";
    const asset = await findAsset(query, wantsVideo, keys);

    if (!asset) {
      // No usable stock asset found — fall back to a text-only quote card rather than a broken visual.
      results.push({ ...scene, visualType: "quote" });
      continue;
    }

    const ext = wantsVideo ? "mp4" : "jpg";
    const fileName = `${scene.id}.${ext}`;
    const filePath = path.join(outDir, fileName);
    await downloadTo(asset.url, filePath);

    results.push({
      ...scene,
      assetPath: filePath,
      assetProvider: asset.provider,
      assetCredit: asset.credit,
      assetSourceUrl: asset.url,
      assetLicense: KNOWN_LICENSES[asset.provider] ?? "Unknown -- requires manual license review",
      assetUsageStatus: KNOWN_LICENSES[asset.provider] ? "approved" : "review_required",
    });
  }
  return results;
}

export function resolveAssetOutDir(videoId: string, storage: StorageProvider = getStorageProvider()): string {
  return storage.resolvePath(videoId, "assets");
}

/** Builds one Media Assets ledger record per downloaded asset (Update 7), skipping scenes with no asset. */
export function scenesToMediaAssets(scenes: Scene[], videoId: string): MediaAsset[] {
  return scenes
    .filter((scene): scene is Scene & { assetPath: string; assetSourceUrl: string } =>
      Boolean(scene.assetPath && scene.assetSourceUrl),
    )
    .map((scene) => ({
      assetId: `${videoId}-${scene.id}`,
      sceneId: scene.id,
      videoId,
      sourceProvider: scene.assetProvider ?? "unknown",
      sourceUrl: scene.assetSourceUrl,
      license: scene.assetLicense ?? "Unknown -- requires manual license review",
      attribution: scene.assetCredit ?? "",
      downloadDate: new Date().toISOString(),
      localPath: scene.assetPath,
      usageStatus: scene.assetUsageStatus ?? "review_required",
    }));
}
