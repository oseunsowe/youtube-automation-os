import express from "express";
import path from "node:path";
import { getLLMProvider } from "./llm/index.js";
import { splitScriptIntoScenes } from "./scenes/index.js";
import { attachAssetsToScenes, resolveAssetOutDir } from "./assets/index.js";
import { generateVoiceForScenes, resolveVoiceOutDir } from "./voice/index.js";
import { renderVideo, resolveRenderPaths, type RenderEngine } from "./render/index.js";
import { uploadVideo } from "./youtube/index.js";
import { env } from "./common/env.js";
import { CategorySchema, ScriptSchema, SceneSchema } from "./common/types.js";
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

const SceneBuildRequestSchema = z.object({ script: ScriptSchema });

app.post("/scenes/build", async (req, res) => {
  try {
    const { script } = SceneBuildRequestSchema.parse(req.body);
    const scenes = splitScriptIntoScenes(script);
    res.json({ scenes });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const AssetsAttachRequestSchema = z.object({
  videoId: z.string(),
  scenes: z.array(SceneSchema),
});

app.post("/assets/attach", async (req, res) => {
  try {
    const { videoId, scenes } = AssetsAttachRequestSchema.parse(req.body);
    const outDir = resolveAssetOutDir(env.worker.dataDir, videoId);
    const updated = await attachAssetsToScenes(
      scenes,
      { pexelsApiKey: env.assets.pexelsApiKey, pixabayApiKey: env.assets.pixabayApiKey },
      outDir,
    );
    res.json({ scenes: updated });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const VoiceRequestSchema = z.object({
  videoId: z.string(),
  scenes: z.array(SceneSchema),
  voice: z.string().default("en-US-AndrewNeural"),
});

app.post("/voice/generate", async (req, res) => {
  try {
    const { videoId, scenes, voice } = VoiceRequestSchema.parse(req.body);
    const outDir = resolveVoiceOutDir(env.worker.dataDir, videoId);
    const updated = await generateVoiceForScenes(scenes, voice, outDir);
    res.json({ scenes: updated });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const RenderRequestSchema = z.object({
  videoId: z.string(),
  scenes: z.array(SceneSchema),
  engine: z.enum(["remotion", "ffmpeg"]).default("remotion"),
});

app.post("/render", async (req, res) => {
  try {
    const { videoId, scenes, engine } = RenderRequestSchema.parse(req.body);
    const { workDir, outPath } = resolveRenderPaths(env.worker.dataDir, videoId);
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
