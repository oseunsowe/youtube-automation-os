import express from "express";
import path from "node:path";
import { getLLMProvider } from "./llm/index.js";
import { splitScriptIntoScenes } from "./scenes/index.js";
import { attachAssetsToScenes, resolveAssetOutDir, scenesToMediaAssets } from "./assets/index.js";
import { generateVoiceForScenes, resolveVoiceOutDir, getVoiceProvider } from "./voice/index.js";
import { renderVideo, resolveRenderPaths, type RenderEngine } from "./render/index.js";
import { uploadVideo } from "./youtube/index.js";
import { AirtableClient, recordMediaAsset } from "./airtable/index.js";
import { env } from "./common/env.js";
import { CategorySchema, ScriptSchema, SceneSchema, SceneDensitySchema } from "./common/types.js";
import { z } from "zod";

const app = express();
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const ScriptRequestSchema = z.object({
  title: z.string().min(1),
  category: CategorySchema,
  runtimeMinutes: z.number().positive().default(5),
});

app.post("/script/generate", async (req, res) => {
  try {
    const body = ScriptRequestSchema.parse(req.body);
    const provider = getLLMProvider();
    const script = await provider.generateScript(body);
    res.json({ provider: provider.name, script });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const VisualPrioritiesSchema = z
  .object({
    stockFootage: z.boolean(),
    archive: z.boolean(),
    map: z.boolean(),
    document: z.boolean(),
    chart: z.boolean(),
    screenshot: z.boolean(),
    aiImage: z.boolean(),
    aiVideo: z.boolean(),
  })
  .partial();

const SceneBuildRequestSchema = z.object({
  script: ScriptSchema,
  sceneDensity: SceneDensitySchema.optional(),
  averageSceneDurationSeconds: z.number().positive().optional(),
  visualPriorities: VisualPrioritiesSchema.optional(),
});

app.post("/scenes/build", async (req, res) => {
  try {
    const { script, ...options } = SceneBuildRequestSchema.parse(req.body);
    const scenes = splitScriptIntoScenes(script, options);
    res.json({ scenes });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const AssetsAttachRequestSchema = z.object({
  videoId: z.string(),
  scenes: z.array(SceneSchema),
  visualPriorities: VisualPrioritiesSchema.optional(),
});

app.post("/assets/attach", async (req, res) => {
  try {
    const { videoId, scenes, visualPriorities } = AssetsAttachRequestSchema.parse(req.body);
    const outDir = resolveAssetOutDir(videoId);
    const updated = await attachAssetsToScenes(
      scenes,
      {
        pexelsApiKey: env.assets.pexelsApiKey,
        pixabayApiKey: env.assets.pixabayApiKey,
        higgsfieldApiKey: env.assets.higgsfieldApiKey,
        higgsfieldBaseUrl: env.assets.higgsfieldBaseUrl,
        useAiImage: visualPriorities?.aiImage ?? false,
        useAiVideo: visualPriorities?.aiVideo ?? false,
      },
      outDir,
    );

    if (env.airtable.apiKey && env.airtable.baseId) {
      const client = new AirtableClient(env.airtable.apiKey, env.airtable.baseId);
      const ledgerRecords = scenesToMediaAssets(updated, videoId);
      await Promise.all(
        ledgerRecords.map((asset) =>
          recordMediaAsset(client, env.airtable.mediaAssetsTable, videoId, asset).catch((err) =>
            console.warn(`[assets] failed to write Media Assets ledger row for ${asset.sceneId}: ${(err as Error).message}`),
          ),
        ),
      );
    }

    res.json({ scenes: updated });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const VoiceRequestSchema = z.object({
  videoId: z.string(),
  scenes: z.array(SceneSchema),
  voice: z.string().default("en-US-AndrewNeural"),
  voiceProvider: z.string().optional(),
});

app.post("/voice/generate", async (req, res) => {
  try {
    const { videoId, scenes, voice, voiceProvider } = VoiceRequestSchema.parse(req.body);
    const outDir = resolveVoiceOutDir(videoId);
    const updated = await generateVoiceForScenes(scenes, voice, outDir, getVoiceProvider(voiceProvider));
    res.json({ scenes: updated });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const RenderRequestSchema = z.object({
  videoId: z.string(),
  scenes: z.array(SceneSchema),
  engine: z.enum(["remotion", "ffmpeg", "json2video"]).default("remotion"),
});

app.post("/render", async (req, res) => {
  try {
    const { videoId, scenes, engine } = RenderRequestSchema.parse(req.body);
    const { workDir, outPath } = resolveRenderPaths(videoId);
    const result = await renderVideo(scenes, workDir, outPath, engine as RenderEngine);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const YouTubeUploadRequestSchema = z.object({
  filePath: z.string(),
  title: z.string(),
  description: z.string().default(""),
  privacyStatus: z.enum(["private", "unlisted", "public"]).default("private"),
});

app.post("/youtube/upload", async (req, res) => {
  try {
    const body = YouTubeUploadRequestSchema.parse(req.body);
    const youtubeId = await uploadVideo(
      {
        clientId: env.youtube.clientId,
        clientSecret: env.youtube.clientSecret,
        refreshToken: env.youtube.refreshToken,
      },
      path.resolve(body.filePath),
      { title: body.title, description: body.description, privacyStatus: body.privacyStatus },
    );
    res.json({ youtubeId });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const port = env.worker.port;
app.listen(port, () => {
  console.log(`[worker] listening on port ${port}`);
});
