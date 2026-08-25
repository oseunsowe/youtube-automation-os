/** Pure scoring logic for the discovery/opportunity engine -- no network, fully unit-testable. */

const YOUTUBE_VIEWS_PER_DAY_CAP = 50_000;
const REDDIT_ENGAGEMENT_CAP = 5_000;

/** Log-scaled 0-100 score from a video's views/day since publish. */
export function scoreViewVelocity(viewsPerDay: number): number {
  if (viewsPerDay <= 0) return 0;
  return Math.min(100, Math.round((Math.log10(viewsPerDay + 1) / Math.log10(YOUTUBE_VIEWS_PER_DAY_CAP + 1)) * 100));
}

/** Log-scaled 0-100 score from a Reddit post's upvotes + weighted comment count. */
export function scoreRedditEngagement(upvotes: number, numComments: number): number {
  const engagement = upvotes + numComments * 2;
  if (engagement <= 0) return 0;
  return Math.min(100, Math.round((Math.log10(engagement + 1) / Math.log10(REDDIT_ENGAGEMENT_CAP + 1)) * 100));
}

/** Weights are fixed, not renormalized -- an unavailable Trends signal contributes 0 rather than being excluded. */
export const SIGNAL_WEIGHTS = { youtube: 0.55, reddit: 0.3, trends: 0.15 } as const;

export interface CandidateSignals {
  youtubeScore: number;
  redditScore: number;
  trendsScore: number;
}

export function combineOpportunityScore(signals: CandidateSignals): number {
  return Math.round(
    signals.youtubeScore * SIGNAL_WEIGHTS.youtube +
      signals.redditScore * SIGNAL_WEIGHTS.reddit +
      signals.trendsScore * SIGNAL_WEIGHTS.trends,
  );
}

export interface RationaleInput {
  youtube: { title: string; viewsPerDay: number; daysAgo: number };
  reddit?: { subreddit: string; title: string; upvotes: number; numComments: number };
  trendsAvailable: boolean;
}

/** Plain-language "why this scored the way it did", shown to the operator before they approve a topic. */
export function buildRationale(input: RationaleInput): string {
  const parts: string[] = [
    `YouTube: "${input.youtube.title}" is getting ~${Math.round(input.youtube.viewsPerDay).toLocaleString()} views/day (published ${input.youtube.daysAgo}d ago).`,
  ];
  if (input.reddit) {
    parts.push(
      `Reddit: r/${input.reddit.subreddit} hot post "${input.reddit.title}" with ${input.reddit.upvotes} upvotes, ${input.reddit.numComments} comments.`,
    );
  } else {
    parts.push("Reddit: no matching hot posts found.");
  }
  parts.push(input.trendsAvailable ? "Google Trends: signal included." : "Google Trends: unavailable, not counted.");
  return parts.join(" ");
}
