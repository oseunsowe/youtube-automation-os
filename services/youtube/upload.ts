import { createReadStream, statSync } from "node:fs";
import { fetchWithTimeout, LONG_FETCH_TIMEOUT_MS } from "../common/fetchTimeout.js";

export interface YouTubeCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface VideoMetadata {
  title: string;
  description: string;
  categoryId?: string;
  privacyStatus?: "private" | "unlisted" | "public";
  tags?: string[];
}

export async function getAccessToken(
  creds: YouTubeCredentials,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchWithTimeout(fetchImpl, "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to refresh YouTube access token: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("YouTube token response missing access_token");
  return data.access_token;
}

export async function initiateResumableUpload(
  accessToken: string,
  metadata: VideoMetadata,
  fileSizeBytes: number,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchWithTimeout(
    fetchImpl,
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": String(fileSizeBytes),
      },
      body: JSON.stringify({
        snippet: {
          title: metadata.title,
          description: metadata.description,
          categoryId: metadata.categoryId ?? "27",
          tags: metadata.tags ?? [],
        },
        status: { privacyStatus: metadata.privacyStatus ?? "private" },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to initiate YouTube upload: ${res.status} ${await res.text()}`);
  }
  const location = res.headers.get("location");
  if (!location) throw new Error("YouTube resumable upload response missing Location header");
  return location;
}

export async function uploadFileToResumableUrl(
  uploadUrl: string,
  filePath: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const { size } = statSync(filePath);
  const res = await fetchWithTimeout(
    fetchImpl,
    uploadUrl,
    {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(size),
      },
      duplex: "half",
      body: createReadStream(filePath),
    },
    LONG_FETCH_TIMEOUT_MS,
  );
  if (!res.ok) {
    throw new Error(`YouTube file upload failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("YouTube upload response missing video id");
  return data.id;
}

export async function uploadVideo(
  creds: YouTubeCredentials,
  filePath: string,
  metadata: VideoMetadata,
): Promise<string> {
  const accessToken = await getAccessToken(creds);
  const { size } = statSync(filePath);
  const uploadUrl = await initiateResumableUpload(accessToken, metadata, size);
  return uploadFileToResumableUrl(uploadUrl, filePath);
}
