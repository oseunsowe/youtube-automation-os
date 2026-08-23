import { z } from "zod";

export const CATEGORIES = [
  "financial-crime",
  "dark-business",
  "mysteries",
  "history",
  "ai-tech",
] as const;
export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

export const SceneVisualType = z.enum([
  "stock_video",
  "image",
  "title",
  "quote",
  "document",
  "screenshot",
  "headline",
]);
export type SceneVisualType = z.infer<typeof SceneVisualType>;

/** Mirrors renderer/remotion/src/scenes/types.ts#SceneSchema. */
export const SceneSchema = z.object({
  id: z.string(),
  index: z.number().int().nonnegative(),
  narration: z.string(),
  durationSeconds: z.number().positive(),
  visualType: SceneVisualType,
  searchQuery: z.string().optional(),
  assetPath: z.string().optional(),
  assetProvider: z.string().optional(),
  assetCredit: z.string().optional(),
  /** Original remote URL before download -- kept for the copyright ledger (see services/assets, Update 7). */
  assetSourceUrl: z.string().optional(),
  assetLicense: z.string().optional(),
  assetUsageStatus: z.enum(["approved", "review_required"]).optional(),
  audioPath: z.string().optional(),
  overlayText: z.string().optional(),
  /** Ken Burns style hint; "static" disables pan/zoom in both renderers. Informational only otherwise. */
  motion: z.string().optional(),
  /** Scene-to-scene transition hint. Stored/passed through but not yet rendered (deferred, see TODO.md). */
  transition: z.string().optional(),
});
export type Scene = z.infer<typeof SceneSchema>;

export const ScriptChapterSchema = z.object({
  title: z.string(),
  startSeconds: z.number().nonnegative(),
});
export type ScriptChapter = z.infer<typeof ScriptChapterSchema>;

export const ScriptSchema = z.object({
  hook: z.string(),
  script: z.string(),
  chapters: z.array(ScriptChapterSchema),
  wordCount: z.number().int().nonnegative(),
  estimatedRuntimeSeconds: z.number().nonnegative(),
});
export type Script = z.infer<typeof ScriptSchema>;

/** Full source/copyright ledger record for one downloaded asset (Update 7 -- "Media Assets" Airtable table). */
export const MediaAssetSchema = z.object({
  assetId: z.string(),
  sceneId: z.string(),
  videoId: z.string(),
  sourceProvider: z.string(),
  sourceUrl: z.string(),
  creator: z.string().optional(),
  license: z.string(),
  attribution: z.string(),
  downloadDate: z.string(),
  localPath: z.string(),
  usageStatus: z.enum(["approved", "review_required"]),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

export const SCENE_DENSITIES = ["low", "medium", "high"] as const;
export const SceneDensitySchema = z.enum(SCENE_DENSITIES);
export type SceneDensity = z.infer<typeof SceneDensitySchema>;

/** Which visual types the Scene Director should prefer when more than one fits (Update 2/6). */
export interface VisualPriorities {
  stockFootage: boolean;
  archive: boolean;
  map: boolean;
  document: boolean;
  chart: boolean;
  screenshot: boolean;
  aiImage: boolean;
  aiVideo: boolean;
}

export const DEFAULT_VISUAL_PRIORITIES: VisualPriorities = {
  stockFootage: true,
  archive: true,
  map: false,
  document: false,
  chart: false,
  screenshot: false,
  aiImage: false,
  aiVideo: false,
};

/** Operator-configurable production settings, expanded from Airtable's Videos table (Update 2). */
export interface ProductionConfig {
  channel?: string;
  targetWordCount?: number;
  voiceProvider: string;
  narrationStyle?: string;
  narrationSpeed?: number;
  visualStyle: string;
  sceneDensity: SceneDensity;
  averageSceneDurationSeconds?: number;
  visualPriorities: VisualPriorities;
  renderProvider: string;
  resolution?: string;
  aspectRatio?: string;
  backgroundMusic: boolean;
  captionStyle?: string;
  researchDepth?: "none" | "basic" | "deep";
  requireScriptApproval: boolean;
  requireFinalApproval: boolean;
  autoPublish: boolean;
  autoRepurpose: boolean;
  publishDate?: string;
  priority?: number;
}

export interface VideoJob {
  videoId: string;
  title: string;
  category: Category;
  runtimeMinutes: number;
  voice: string;
  visualStyle: string;
  production: ProductionConfig;
}
