import { fetchWithTimeout } from "../common/fetchTimeout.js";

export interface AssetResult {
  provider: "pexels" | "pixabay" | "higgsfield";
  url: string;
  credit: string;
}

export async function searchPexelsVideo(
  query: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AssetResult | null> {
  if (!apiKey) return null;
  const res = await fetchWithTimeout(
    fetchImpl,
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    { headers: { Authorization: apiKey } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    videos?: { url: string; user?: { name?: string }; video_files?: { link: string; quality?: string }[] }[];
  };
  const video = data.videos?.[0];
  const file =
    video?.video_files?.find((f) => f.quality === "hd") ?? video?.video_files?.[0];
  if (!video || !file) return null;
  return {
    provider: "pexels",
    url: file.link,
    credit: `Video by ${video.user?.name ?? "Pexels contributor"} on Pexels`,
  };
}

export async function searchPexelsPhoto(
  query: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AssetResult | null> {
  if (!apiKey) return null;
  const res = await fetchWithTimeout(
    fetchImpl,
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    { headers: { Authorization: apiKey } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    photos?: { src?: { large2x?: string }; photographer?: string }[];
  };
  const photo = data.photos?.[0];
  if (!photo?.src?.large2x) return null;
  return {
    provider: "pexels",
    url: photo.src.large2x,
    credit: `Photo by ${photo.photographer ?? "Pexels contributor"} on Pexels`,
  };
}
