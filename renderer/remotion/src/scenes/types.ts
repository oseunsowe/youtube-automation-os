import { z } from "zod";

export const SceneVisualType = z.enum([
  "stock_video",
  "image",
  "title",
  "quote",
]);
export type SceneVisualType = z.infer<typeof SceneVisualType>;

export const SceneSchema = z.object({
  id: z.string(),
  index: z.number().int().nonnegative(),
  narration: z.string(),
  durationSeconds: z.number().positive(),
  visualType: SceneVisualType,
  assetPath: z.string().optional(),
  audioPath: z.string().optional(),
  overlayText: z.string().optional(),
});
export type Scene = z.infer<typeof SceneSchema>;
