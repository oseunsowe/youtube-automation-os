import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { Scene } from "../common/types.js";
import { searchPexelsPhoto, searchPexelsVideo, type AssetResult } from "./pexels.js";
import { searchPixabayPhoto, searchPixabayVideo } from "./pixabay.js";

export type { AssetResult } from "./pexels.js";

export interface AssetProviderKeys {
  pexelsApiKey: string;
  pixabayApiKey: string;
}

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
    if (scene.visualType !== "stock_video" && scene.visualType !== "image") {
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
    });
  }
  return results;
}

export function resolveAssetOutDir(dataDir: string, videoId: string): string {
  return path.join(dataDir, videoId, "assets");
}
