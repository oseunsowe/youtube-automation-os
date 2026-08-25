import { fetchWithTimeout } from "../common/fetchTimeout.js";

export interface RedditPost {
  subreddit: string;
  title: string;
  url: string;
  upvotes: number;
  numComments: number;
}

/** Reddit's public JSON endpoint -- no auth needed for read-only, but requires a descriptive User-Agent. */
export async function fetchTopHotPost(subreddit: string, fetchImpl: typeof fetch = fetch): Promise<RedditPost | null> {
  const res = await fetchWithTimeout(fetchImpl, `https://www.reddit.com/r/${subreddit}/hot.json?limit=5`, {
    headers: { "User-Agent": "youtube-automation-os-discovery/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Reddit fetch failed for r/${subreddit}: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as {
    data?: {
      children?: Array<{
        data?: { title?: string; ups?: number; num_comments?: number; permalink?: string; stickied?: boolean };
      }>;
    };
  };
  const posts = (data.data?.children ?? [])
    .map((c) => c.data)
    .filter((d): d is NonNullable<typeof d> => !!d && !d.stickied);
  if (posts.length === 0) return null;

  const top = posts.reduce((best, p) => ((p.ups ?? 0) > (best.ups ?? 0) ? p : best));
  return {
    subreddit,
    title: top.title ?? "(untitled)",
    url: `https://www.reddit.com${top.permalink ?? ""}`,
    upvotes: top.ups ?? 0,
    numComments: top.num_comments ?? 0,
  };
}

/** Highest-engagement hot post across several subreddits for one category. */
export async function fetchBestHotPost(subreddits: string[], fetchImpl: typeof fetch = fetch): Promise<RedditPost | null> {
  const posts = await Promise.all(subreddits.map((sub) => fetchTopHotPost(sub, fetchImpl)));
  const found = posts.filter((p): p is RedditPost => !!p);
  if (found.length === 0) return null;
  return found.reduce((best, p) => (p.upvotes > best.upvotes ? p : best));
}
