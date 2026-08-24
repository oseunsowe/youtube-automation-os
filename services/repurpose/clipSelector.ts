import type { Scene, ClipCandidate } from "../common/types.js";

export interface SelectClipsOptions {
  maxClips?: number;
  minClipSeconds?: number;
  maxClipSeconds?: number;
}

interface TimedScene {
  scene: Scene;
  start: number;
  end: number;
}

function withTimings(scenes: Scene[]): TimedScene[] {
  let cursor = 0;
  return scenes.map((scene) => {
    const start = cursor;
    cursor += scene.durationSeconds;
    return { scene, start, end: cursor };
  });
}

/** Grows a window around an anchor scene, adding following scenes until it's within [min, max] seconds. */
function buildWindow(anchorIndex: number, timed: TimedScene[], minSeconds: number, maxSeconds: number): TimedScene[] {
  let endIdx = anchorIndex;
  let duration = timed[anchorIndex].scene.durationSeconds;

  while (duration < minSeconds && endIdx < timed.length - 1) {
    const nextDuration = timed[endIdx + 1].scene.durationSeconds;
    if (duration + nextDuration > maxSeconds) break;
    endIdx += 1;
    duration += nextDuration;
  }

  return timed.slice(anchorIndex, endIdx + 1);
}

/**
 * Picks candidate short-form clips from a scene plan: the opening hook, any
 * quote/dramatic beats, and (if still short of maxClips) evenly-spaced
 * scenes across the rest -- then expands each into a min/max-length window
 * and drops any that overlap an already-picked clip (Update 12: "identify
 * strongest moments", independent of/deferred from the main pipeline).
 */
export function selectClips(scenes: Scene[], options: SelectClipsOptions = {}): ClipCandidate[] {
  const maxClips = options.maxClips ?? 4;
  const minClipSeconds = options.minClipSeconds ?? 15;
  const maxClipSeconds = options.maxClipSeconds ?? 45;

  if (scenes.length === 0) return [];

  const timed = withTimings(scenes);

  const anchorIndices = new Set<number>([0]);
  timed.forEach((t, i) => {
    if (t.scene.visualType === "quote") anchorIndices.add(i);
  });

  if (anchorIndices.size < maxClips) {
    const step = Math.max(1, Math.floor(timed.length / maxClips));
    for (let i = 0; i < timed.length && anchorIndices.size < maxClips; i += step) {
      anchorIndices.add(i);
    }
  }

  const sortedAnchors = [...anchorIndices].sort((a, b) => a - b).slice(0, maxClips);

  const usedRanges: Array<[number, number]> = [];
  const clips: ClipCandidate[] = [];

  for (const anchor of sortedAnchors) {
    const window = buildWindow(anchor, timed, minClipSeconds, maxClipSeconds);
    const first = window[0];
    const last = window[window.length - 1];

    const overlaps = usedRanges.some(([s, e]) => first.start < e && last.end > s);
    if (overlaps) continue;
    usedRanges.push([first.start, last.end]);

    clips.push({
      id: `clip-${clips.length + 1}`,
      startSeconds: first.start,
      endSeconds: last.end,
      hook: first.scene.overlayText ?? first.scene.narration,
      sceneRange: first.scene.id === last.scene.id ? first.scene.id : `${first.scene.id}..${last.scene.id}`,
    });
  }

  return clips;
}
