import type {
  Scene,
  SceneVisualType,
  Script,
  SceneDensity,
  VisualPriorities,
} from "../common/types.js";
import { DEFAULT_VISUAL_PRIORITIES } from "../common/types.js";

const WORDS_PER_MINUTE = 150;
const MIN_SCENE_SECONDS = 3;

/** Target average seconds-per-scene by density (Update 5's worked examples average ~8-9s/scene). */
const DENSITY_AVG_SCENE_SECONDS: Record<SceneDensity, number> = {
  low: 12,
  medium: 8,
  high: 5,
};

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

function extractSearchQuery(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return words.slice(0, 6).join(" ");
}

function splitIntoSentences(script: string): string[] {
  return script
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Splits one sentence at its internal clause boundaries (commas/semicolons/colons). */
function splitIntoClauses(sentence: string): string[] {
  return sentence
    .split(/(?<=[,;:])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Narration units to pack into scenes. A long, clause-heavy sentence can span
 * several visual events on its own (Update 5: "a narrative section can
 * contain multiple visual events"), so once plain sentences can't reach the
 * target scene count, fall back to clause-level units for finer granularity.
 */
function buildNarrationUnits(sentences: string[], targetSceneCount: number): string[] {
  if (sentences.length >= targetSceneCount) return sentences;
  return sentences.flatMap((sentence) => splitIntoClauses(sentence));
}

/** Greedily groups sentences so each group's word count is close to targetWordsPerScene. */
function packSentencesIntoGroups(sentences: string[], targetWordsPerScene: number): string[] {
  const groups: string[][] = [];
  let current: string[] = [];
  let currentWords = 0;

  for (const sentence of sentences) {
    current.push(sentence);
    currentWords += wordCount(sentence);
    if (currentWords >= targetWordsPerScene) {
      groups.push(current);
      current = [];
      currentWords = 0;
    }
  }
  if (current.length > 0) {
    const lastGroupIsSmall = currentWords < targetWordsPerScene / 2;
    if (lastGroupIsSmall && groups.length > 0) {
      groups[groups.length - 1].push(...current);
    } else {
      groups.push(current);
    }
  }

  return groups.map((g) => g.join(" "));
}

/**
 * Builds the rotation of visual types the router cycles through, based on
 * which production-config priorities are enabled (Update 2/6). Map/chart
 * don't have dedicated Remotion/ffmpeg components yet, so they route to
 * "image" for now (deferred -- see TODO.md).
 */
function buildVisualRotation(priorities: VisualPriorities): SceneVisualType[] {
  const rotation: SceneVisualType[] = [];
  if (priorities.stockFootage) rotation.push("stock_video");
  if (priorities.archive) rotation.push("image");
  if (priorities.document) rotation.push("document");
  if (priorities.screenshot) rotation.push("screenshot");
  if (priorities.map) rotation.push("image");
  if (priorities.chart) rotation.push("image");
  return rotation.length > 0 ? rotation : ["image", "stock_video"];
}

function pickVisualType(index: number, text: string, rotation: SceneVisualType[]): SceneVisualType {
  if (index === 0) return "title";
  const looksLikeQuote = /["“].+["”]/.test(text);
  if (looksLikeQuote) return "quote";
  return rotation[(index - 1) % rotation.length];
}

export interface SplitScriptOptions {
  sceneDensity?: SceneDensity;
  averageSceneDurationSeconds?: number;
  visualPriorities?: Partial<VisualPriorities>;
}

/** Splits a generated Script into a scene plan, targeting a runtime-derived scene count (Update 5). */
export function splitScriptIntoScenes(script: Script, options: SplitScriptOptions = {}): Scene[] {
  const avgSceneSeconds =
    options.averageSceneDurationSeconds ?? DENSITY_AVG_SCENE_SECONDS[options.sceneDensity ?? "medium"];
  const rotation = buildVisualRotation({ ...DEFAULT_VISUAL_PRIORITIES, ...options.visualPriorities });

  const sentences = splitIntoSentences(script.script);
  if (sentences.length === 0) return [];

  const totalWords = wordCount(script.script);
  const targetSceneCount = Math.max(1, Math.round(script.estimatedRuntimeSeconds / avgSceneSeconds));
  const targetWordsPerScene = Math.max(1, totalWords / targetSceneCount);

  const units = buildNarrationUnits(sentences, targetSceneCount);
  const groups = packSentencesIntoGroups(units, targetWordsPerScene);

  return groups.map((narration, index) => ({
    id: `scene-${String(index + 1).padStart(2, "0")}`,
    index,
    narration,
    durationSeconds: estimateSeconds(narration),
    visualType: pickVisualType(index, narration, rotation),
    searchQuery: extractSearchQuery(narration),
  }));
}
