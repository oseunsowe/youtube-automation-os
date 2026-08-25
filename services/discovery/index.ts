import type { Category, TopicSuggestion } from "../common/types.js";
import { getCategorySources, type CategorySources } from "./sources.js";
import { searchTrendingVideos, type YoutubeCandidate } from "./youtube.js";
import { fetchBestHotPost, type RedditPost } from "./reddit.js";
import { fetchTrendingTermsUS, scoreKeywordAgainstTrends } from "./trends.js";
import { scoreViewVelocity, scoreRedditEngagement, combineOpportunityScore, buildRationale } from "./score.js";

export interface DiscoveryOptions {
  youtubeApiKey: string;
  fetchImpl?: typeof fetch;
  now?: Date;
}

/** Runs the discovery/opportunity engine for a set of categories -- one HTTP call per category from services/server.ts. */
export async function findTopicSuggestions(
  categories: Category[],
  maxPerCategory: number,
  options: DiscoveryOptions,
): Promise<TopicSuggestion[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const trendingTerms = await fetchTrendingTermsUS(fetchImpl);

  const results = await Promise.all(
    categories.map((category) => {
      const config = getCategorySources(category);
      if (!config) return Promise.resolve([]);
      return findSuggestionsForCategory(category, config, maxPerCategory, trendingTerms, options, fetchImpl);
    }),
  );
  return results.flat();
}

async function findSuggestionsForCategory(
  category: Category,
  config: CategorySources,
  maxPerCategory: number,
  trendingTerms: string[],
  options: DiscoveryOptions,
  fetchImpl: typeof fetch,
): Promise<TopicSuggestion[]> {
  const candidateLists = await Promise.all(
    config.keywords.map((keyword) =>
      searchTrendingVideos(keyword, 5, { apiKey: options.youtubeApiKey, fetchImpl, now: options.now }).catch(
        (err) => {
          console.warn(`[discovery] YouTube search failed for "${keyword}" (${category}): ${(err as Error).message}`);
          return [] as YoutubeCandidate[];
        },
      ),
    ),
  );
  const candidates = dedupeByVideoId(candidateLists.flat())
    .sort((a, b) => b.viewsPerDay - a.viewsPerDay)
    .slice(0, maxPerCategory);

  let redditPost: RedditPost | null = null;
  try {
    redditPost = await fetchBestHotPost(config.subreddits, fetchImpl);
  } catch (err) {
    console.warn(`[discovery] Reddit fetch failed for ${category}: ${(err as Error).message}`);
  }
  const redditScore = redditPost ? scoreRedditEngagement(redditPost.upvotes, redditPost.numComments) : 0;
  const trendsAvailable = trendingTerms.length > 0;

  return candidates.map((candidate) => {
    const youtubeScore = scoreViewVelocity(candidate.viewsPerDay);
    const trendsScore = scoreKeywordAgainstTrends(candidate.title, trendingTerms);
    const opportunityScore = combineOpportunityScore({ youtubeScore, redditScore, trendsScore });
    const daysAgo = Math.max(1, Math.round((Date.now() - new Date(candidate.publishedAt).getTime()) / (24 * 60 * 60 * 1000)));
    const rationale = buildRationale({
      youtube: { title: candidate.title, viewsPerDay: candidate.viewsPerDay, daysAgo },
      reddit: redditPost ?? undefined,
      trendsAvailable,
    });
    const sources = [candidate.url, ...(redditPost ? [redditPost.url] : [])];

    return { title: candidate.title, category, opportunityScore, rationale, sources };
  });
}

function dedupeByVideoId(candidates: YoutubeCandidate[]): YoutubeCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((c) => {
    if (seen.has(c.videoId)) return false;
    seen.add(c.videoId);
    return true;
  });
}
