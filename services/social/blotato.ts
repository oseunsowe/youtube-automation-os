import { readFile } from "node:fs/promises";
import type { SocialPlatform } from "../common/types.js";

/**
 * Blotato cross-platform posting adapter.
 *
 * IMPORTANT: written from general knowledge of how "upload media, then
 * create a post targeting platforms" SaaS APIs typically work -- there's no
 * Blotato account here to verify the exact endpoint paths/payload shape
 * against their real docs (https://blotato.com). Treat this as a starting
 * point, not a verified integration, same caveat as
 * services/assets/higgsfield.ts. Everything that calls this only runs when
 * explicitly triggered (the standalone 14-social-repurpose.json workflow),
 * never automatically.
 */

export interface BlotatoOptions {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export async function uploadMedia(filePath: string, options: BlotatoOptions): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const buffer = await readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([buffer]), filePath.split(/[\\/]/).pop() ?? "clip.mp4");

  const res = await fetchImpl(`${options.baseUrl}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${options.apiKey}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Blotato media upload failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { url?: string; mediaUrl?: string };
  const mediaUrl = data.url ?? data.mediaUrl;
  if (!mediaUrl) throw new Error("Blotato media upload response missing url");
  return mediaUrl;
}

export interface BlotatoPostResult {
  postId: string;
  url?: string;
}

export async function createPost(
  mediaUrl: string,
  platform: SocialPlatform,
  caption: string,
  options: BlotatoOptions,
): Promise<BlotatoPostResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl(`${options.baseUrl}/posts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ platform, mediaUrl, caption }),
  });
  if (!res.ok) {
    throw new Error(`Blotato create post failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { id?: string; postId?: string; url?: string };
  const postId = data.id ?? data.postId;
  if (!postId) throw new Error("Blotato create post response missing id");
  return { postId, url: data.url };
}

/** Uploads a local clip file and posts it to one platform in one call. */
export async function postClip(
  filePath: string,
  platform: SocialPlatform,
  caption: string,
  options: BlotatoOptions,
): Promise<BlotatoPostResult> {
  const mediaUrl = await uploadMedia(filePath, options);
  return createPost(mediaUrl, platform, caption, options);
}
