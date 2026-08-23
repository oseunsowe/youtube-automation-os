import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { MediaAsset, Scene } from "../common/types.js";
import { searchPexelsPhoto, searchPexelsVideo, type AssetResult } from "./pexels.js";
import { searchPixabayPhoto, searchPixabayVideo } from "./pixabay.js";
import { generateImage, generateVideo } from "./higgsfield.js";
import { getStorageProvider, type StorageProvider } from "../storage/index.js";

export type { AssetResult } from "./pexels.js";

export interface AssetProviderKeys {
  pexelsApiKey: string;
  pixabayApiKey: string;
  /** AI generation is a fallback used only when real footage search misses AND the operator opted in. */
  higgsfieldApiKey?: string;
  higgsfieldBaseUrl?: string;
  useAiImage?: boolean;
  useAiVideo?: boolean;
}

const KNOWN_LICENSES: Record<string, string> = {
  pexels: "Pexels License (free, no attribution required)",
  pixabay: "Pixabay License (free, no attribution required)",
  higgsfield: "AI-generated (Higgsfield) -- verify commercial usage terms and platform AI-disclosure requirements",
};

/** Visual types that need a downloaded still/video asset rather than a rendered text card. */
const ASSET_BACKED_TYPES = new Set(["stock_video", "image", "document", "screenshot"]);

async function findAsset(
  query: string,
  wantsVideo: boolean,
  keys: AssetProviderKeys,
): Promise<AssetResult | null> {
  const stockAsset = wantsVideo
    ? (await searchPexelsVideo(query, keys.pexelsApiKey)) ?? (await searchPixabayVideo(query, keys.pixabayApiKey))
    : (await searchPexelsPhoto(query, keys.pexelsApiKey)) ?? (await searchPixabayPhoto(query, keys.pixabayApiKey));

  if (stockAsset) return stockAsset;

  // Real footage is searched first (Update 6: "search real footage before
  // generating synthetic media"); AI generation only kicks in when the
  // operator explicitly enabled it and stock search came up empty.
  const wantsAi = wantsVideo ? keys.useAiVideo : keys.useAiImage;
  if (!wantsAi || !keys.higgsfieldApiKey) return null;

  try {
    const higgsfieldOptions = {
      apiKey: keys.higgsfieldApiKey,
      baseUrl: keys.higgsfieldBaseUrl ?? "https://api.higgsfield.ai/v1",
    };
    return wantsVideo ? await generateVideo(query, higgsfieldOptions) : await generateImage(query, higgsfieldOptions);
  } catch (err) {
    console.warn(`[assets] Higgsfield generation failed for "${query}": ${(err as Error).message}`);
    return null;
  }
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
