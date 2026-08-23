import type { AssetResult } from "./pexels.js";

export async function searchPixabayVideo(
  query: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AssetResult | null> {
  if (!apiKey) return null;
  const res = await fetchImpl(
    `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=3`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    hits?: { videos?: { medium?: { url?: string } }; user?: string }[];
  };
  const hit = data.hits?.[0];
  const url = hit?.videos?.medium?.url;
  if (!url) return null;
  return {
    provider: "pixabay",
    url,
    credit: `Video by ${hit?.user ?? "Pixabay contributor"} on Pixabay`,
  };
}

export async function searchPixabayPhoto(
  query: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AssetResult | null> {
  if (!apiKey) return null;
  const res = await fetchImpl(
    `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=3&image_type=photo`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    hits?: { largeImageURL?: string; user?: string }[];
  };
  const hit = data.hits?.[0];
  if (!hit?.largeImageURL) return null;
  return {
    provider: "pixabay",
    url: hit.largeImageURL,
    credit: `Photo by ${hit.user ?? "Pixabay contributor"} on Pixabay`,
  };
}
