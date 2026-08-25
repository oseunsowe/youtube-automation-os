import { fetchWithTimeout } from "../common/fetchTimeout.js";

export interface YoutubeCandidate {
  videoId: string;
  title: string;
  url: string;
  viewCount: number;
  publishedAt: string;
  viewsPerDay: number;
}

export interface YoutubeSearchOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  now?: Date;
}

/** Searches recent videos for a keyword, then pulls view counts -- the raw material for the view-velocity signal. */
export async function searchTrendingVideos(
  keyword: string,
  maxResults: number,
  options: YoutubeSearchOptions,
): Promise<YoutubeCandidate[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? new Date();

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "id");
  searchUrl.searchParams.set("q", keyword);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", "viewCount");
  searchUrl.searchParams.set("publishedAfter", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());
  searchUrl.searchParams.set("maxResults", String(maxResults));
  searchUrl.searchParams.set("key", options.apiKey);

  const searchRes = await fetchWithTimeout(fetchImpl, searchUrl.toString());
  if (!searchRes.ok) {
    throw new Error(`YouTube search failed for "${keyword}": ${searchRes.status} ${await searchRes.text()}`);
  }
  const searchData = (await searchRes.json()) as { items?: Array<{ id?: { videoId?: string } }> };
  const videoIds = (searchData.items ?? []).map((i) => i.id?.videoId).filter((id): id is string => !!id);
  if (videoIds.length === 0) return [];

  const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  statsUrl.searchParams.set("part", "snippet,statistics");
  statsUrl.searchParams.set("id", videoIds.join(","));
  statsUrl.searchParams.set("key", options.apiKey);

  const statsRes = await fetchWithTimeout(fetchImpl, statsUrl.toString());
  if (!statsRes.ok) {
    throw new Error(`YouTube videos.list failed: ${statsRes.status} ${await statsRes.text()}`);
  }
  const statsData = (await statsRes.json()) as {
    items?: Array<{
      id: string;
      snippet?: { title?: string; publishedAt?: string };
      statistics?: { viewCount?: string };
    }>;
  };

  return (statsData.items ?? []).map((item) => {
    const viewCount = Number(item.statistics?.viewCount ?? 0);
    const publishedAt = item.snippet?.publishedAt ?? now.toISOString();
    const ageDays = Math.max(1, (now.getTime() - new Date(publishedAt).getTime()) / (24 * 60 * 60 * 1000));
    return {
      videoId: item.id,
      title: item.snippet?.title ?? "(untitled)",
      url: `https://www.youtube.com/watch?v=${item.id}`,
      viewCount,
      publishedAt,
      viewsPerDay: viewCount / ageDays,
    };
  });
}
