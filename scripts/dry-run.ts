/**
 * End-to-end Phase 1 dry run, usable with no API keys or Docker via LLM_PROVIDER=mock.
 * Optional stages (assets/voice/render/upload) are attempted only when their
 * required env vars/binaries are present, and are skipped with a clear log
 * line otherwise -- run this for real (all keys set) once inside the Codespace.
 */
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { getLLMProvider } from "../services/llm/index.js";
import { splitScriptIntoScenes } from "../services/scenes/index.js";
import { attachAssetsToScenes, resolveAssetOutDir } from "../services/assets/index.js";
import { generateVoiceForScenes, resolveVoiceOutDir } from "../services/voice/index.js";
import { renderVideo, resolveRenderPaths } from "../services/render/index.js";
import { env } from "../services/common/env.js";
import type { Scene } from "../services/common/types.js";

const videoId = "dry-run-" + Date.now();

async function main() {
  console.log(`[dry-run] LLM provider: ${env.llm.provider}`);
  const provider = getLLMProvider();

  const script = await provider.generateScript({
    title: "The $8 Billion Ponzi No One Saw Coming",
    category: "financial-crime",
    runtimeMinutes: 1,
  });
  console.log(`[dry-run] script: ${script.wordCount} words, ${script.chapters.length} chapters`);

  let scenes: Scene[] = splitScriptIntoScenes(script);
  console.log(`[dry-run] scenes: ${scenes.length}`);

  const outDir = path.join(env.worker.dataDir, videoId);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "script.json"), JSON.stringify(script, null, 2));
  await writeFile(path.join(outDir, "scenes.json"), JSON.stringify(scenes, null, 2));

  if (env.assets.pexelsApiKey || env.assets.pixabayApiKey) {
    scenes = await attachAssetsToScenes(
      scenes,
      { pexelsApiKey: env.assets.pexelsApiKey, pixabayApiKey: env.assets.pixabayApiKey },
      resolveAssetOutDir(env.worker.dataDir, videoId),
    );
    console.log("[dry-run] assets attached");
  } else {
    console.log("[dry-run] skipped: assets (no PEXELS_API_KEY/PIXABAY_API_KEY set)");
  }

  try {
    scenes = await generateVoiceForScenes(scenes, "en-US-AndrewNeural", resolveVoiceOutDir(env.worker.dataDir, videoId));
    console.log("[dry-run] voice generated");
  } catch (err) {
    console.log(`[dry-run] skipped: voice (${(err as Error).message})`);
  }

  const allScenesHaveAudio = scenes.every((s) => s.audioPath);
  if (allScenesHaveAudio) {
    try {
      const { workDir, outPath } = resolveRenderPaths(env.worker.dataDir, videoId);
      const result = await renderVideo(scenes, workDir, outPath, "ffmpeg");
      console.log(`[dry-run] rendered via ${result.engine} -> ${result.outPath}`);
    } catch (err) {
      console.log(`[dry-run] skipped: render (${(err as Error).message})`);
    }
  } else {
    console.log("[dry-run] skipped: render (no scene has narration audio yet)");
  }

  console.log(`[dry-run] done. Intermediate files in ${outDir}`);
}

main().catch((err) => {
  console.error("[dry-run] failed:", err);
  process.exit(1);
});
