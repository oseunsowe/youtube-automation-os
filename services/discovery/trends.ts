import { fetchWithTimeout } from "../common/fetchTimeout.js";

/**
 * Best-effort signal from Google's unofficial "daily trends" RSS feed --
 * undocumented, no key, and known to change shape without notice. Never
 * throws: any failure here just means the Trends signal contributes 0 to
 * the final score (see services/discovery/score.ts), it never fails the
 * whole discovery run.
 */
export async function fetchTrendingTermsUS(fetchImpl: typeof fetch = fetch): Promise<string[]> {
  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US",
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const matches = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)];
    return matches.slice(1).map((m) => m[1].trim());
  } catch {
    return [];
  }
}

/** Crude substring match against today's trending terms -- a real term-overlap check would need NLP the rest of this repo doesn't have yet. */
export function scoreKeywordAgainstTrends(candidateTitle: string, trendingTerms: string[]): number {
  if (trendingTerms.length === 0) return 0;
  const lowerTitle = candidateTitle.toLowerCase();
  const hit = trendingTerms.some((term) => {
    const lowerTerm = term.toLowerCase();
    return lowerTitle.includes(lowerTerm) || lowerTerm.includes(lowerTitle);
  });
  return hit ? 100 : 0;
}
