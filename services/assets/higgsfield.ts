import { fetchWithTimeout } from "../common/fetchTimeout.js";

/**
 * Higgsfield AI image/video generation adapter.
 *
 * Verified against Higgsfield's real docs (https://docs.higgsfield.ai) --
 * base URL, auth header shape, endpoints, and polling below are confirmed,
 * not guessed. Everything that calls this is gated behind the "AI Image
 * Usage"/"AI Video Usage" Airtable toggles (default off), so nothing
 * changes for anyone not opting in.
 *
 * Two things worth knowing:
 * - Auth is `Key {apiKeyId}:{apiKeySecret}` -- TWO credential parts, not
 *   one bearer token. Higgsfield issues both from your account dashboard.
 * - There is no text-to-video endpoint. Higgsfield's video model is
 *   image-to-video ("dop/standard"): it animates a still image from a
 *   prompt. generateVideo() below chains two jobs -- it generates a still
 *   via the image endpoint first, then feeds that image into the video
 *   endpoint -- so from the caller's side it still looks like "prompt in,
 *   video out," but it costs two generation jobs, not one.
 */

export interface HiggsfieldResult {
  provider: "higgsfield";
  url: string;
  credit: string;
}

export interface HiggsfieldOptions {
  apiKeyId: string;
  apiKeySecret: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

interface HiggsfieldRequestStatus {
  status: "queued" | "in_progress" | "nsfw" | "failed" | "completed" | "canceled";
  request_id: string;
  error?: string | null;
  images?: { url: string }[];
  video?: { url: string };
}

function authHeader(options: HiggsfieldOptions): string {
  return `Key ${options.apiKeyId}:${options.apiKeySecret}`;
}

async function submitJob(path: string, body: Record<string, unknown>, options: HiggsfieldOptions): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchWithTimeout(fetchImpl, `${options.baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(options),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Higgsfield job submission failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { request_id?: string };
  if (!data.request_id) throw new Error("Higgsfield response missing request_id");
  return data.request_id;
}

async function pollJob(
  requestId: string,
  options: HiggsfieldOptions,
): Promise<HiggsfieldRequestStatus> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const pollIntervalMs = options.pollIntervalMs ?? 4000;
  const maxPollAttempts = options.maxPollAttempts ?? 60;

  for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
    const res = await fetchWithTimeout(fetchImpl, `${options.baseUrl}/requests/${requestId}/status`, {
      headers: { Authorization: authHeader(options), Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Higgsfield job status check failed: ${res.status} ${await res.text()}`);
    }
    const status = (await res.json()) as HiggsfieldRequestStatus;
    if (status.status === "failed" || status.status === "canceled" || status.status === "nsfw") {
      throw new Error(`Higgsfield generation job ${requestId} ended with status "${status.status}"${status.error ? `: ${status.error}` : ""}`);
    }
    if (status.status === "completed") {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Higgsfield job ${requestId} did not finish within the poll budget`);
}

/** Generates a still image from a text prompt (AI Image Usage). */
export async function generateImage(prompt: string, options: HiggsfieldOptions): Promise<HiggsfieldResult> {
  const requestId = await submitJob(
    "/higgsfield-ai/soul/standard",
    { prompt, aspect_ratio: "16:9", resolution: "720p" },
    options,
  );
  const result = await pollJob(requestId, options);
  const url = result.images?.[0]?.url;
  if (!url) throw new Error(`Higgsfield image job ${requestId} completed with no image url`);
  return { provider: "higgsfield", url, credit: "AI-generated image via Higgsfield" };
}

/**
 * Generates a short video clip from a text prompt (AI Video Usage).
 * Higgsfield has no text-to-video endpoint, so this generates a still
 * image first and animates that -- two chained generation jobs.
 */
export async function generateVideo(prompt: string, options: HiggsfieldOptions): Promise<HiggsfieldResult> {
  const image = await generateImage(prompt, options);

  const requestId = await submitJob(
    "/higgsfield-ai/dop/standard",
    { image_url: image.url, prompt },
    options,
  );
  const result = await pollJob(requestId, options);
  const url = result.video?.url;
  if (!url) throw new Error(`Higgsfield video job ${requestId} completed with no video url`);
  return { provider: "higgsfield", url, credit: "AI-generated video via Higgsfield" };
}
