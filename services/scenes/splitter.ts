import type { Scene, SceneVisualType, Script } from "../common/types.js";

const WORDS_PER_MINUTE = 150;
const MIN_SCENE_SECONDS = 3;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to", "for",
  "with", "was", "were", "is", "are", "it", "that", "this", "as", "by", "from",
  "be", "been", "his", "her", "their", "he", "she", "they", "you", "your",
]);

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function estimateSeconds(text: string): number {
  const seconds = (wordCount(text) / WORDS_PER_MINUTE) * 60;
  return Math.max(MIN_SCENE_SECONDS, Math.round(seconds));
}

function pickVisualType(index: number, total: number, text: string): SceneVisualType {
  if (index === 0) return "title";
  const looksLikeQuote = /["“].+["”]/.test(text);
  if (looksLikeQuote) return "quote";
  return index % 2 === 0 ? "image" : "stock_video";
}

function extractSearchQuery(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return words.slice(0, 6).join(" ");
}

/** Splits a generated Script into scene-plan Scenes (visuals/assets are attached in later steps). */
export function splitScriptIntoScenes(script: Script): Scene[] {
  const paragraphs = script.script
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return paragraphs.map((narration, index) => ({
    id: `scene-${String(index + 1).padStart(2, "0")}`,
    index,
    narration,
    durationSeconds: estimateSeconds(narration),
    visualType: pickVisualType(index, paragraphs.length, narration),
    searchQuery: extractSearchQuery(narration),
  }));
}
