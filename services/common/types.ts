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
  audioPath: z.string().optional(),
  overlayText: z.string().optional(),
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

export interface VideoJob {
  videoId: string;
  title: string;
  category: Category;
  runtimeMinutes: number;
  voice: string;
  visualStyle: string;
}
