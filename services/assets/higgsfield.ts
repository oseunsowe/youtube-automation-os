/**
 * Higgsfield AI image/video generation adapter.
 *
 * IMPORTANT: Higgsfield doesn't have the kind of widely-documented public
 * REST API that Pexels/Pixabay/JSON2Video have, and this was written
 * without an account to verify against. The endpoint paths, auth header,
 * and request/response shape below are a best-guess placeholder following
 * the common "submit a generation job, poll for status, download the
 * result" pattern most generative image/video APIs use -- treat this as a
 * starting point, not a verified integration. Check https://higgsfield.ai's
 * current API docs and adjust `HIGGSFIELD_API_BASE_URL` / the paths below
 * before relying on it. Everything that calls this is gated behind the
 * "AI Image Usage"/"AI Video Usage" Airtable toggles (default off), so
 * nothing breaks for anyone not opting in.
 */

export interface HiggsfieldResult {
  provider: "higgsfield";
  url: string;
  credit: string;
}

export interface HiggsfieldOptions {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

interface HiggsfieldJobStatus {
  status: "pending" | "processing" | "completed" | "failed";
  outputUrl?: string;
}

async function submitJob(
  path: string,
  body: Record<string, unknown>,
  options: HiggsfieldOptions,
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl(`${options.baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Higgsfield job submission failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { id?: string; jobId?: string };
  const jobId = data.id ?? data.jobId;
  if (!jobId) throw new Error("Higgsfield response missing job id");
  return jobId;
}

async function pollJob(jobId: string, options: HiggsfieldOptions): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const pollIntervalMs = options.pollIntervalMs ?? 4000;
  const maxPollAttempts = options.maxPollAttempts ?? 60;

  for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
    const res = await fetchImpl(`${options.baseUrl}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${options.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Higgsfield job status check failed: ${res.status} ${await res.text()}`);
    }
    const status = (await res.json()) as HiggsfieldJobStatus;
    if (status.status === "failed") {
      throw new Error(`Higgsfield generation job ${jobId} failed`);
    }
    if (status.status === "completed" && status.outputUrl) {
      return status.outputUrl;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Higgsfield job ${jobId} did not finish within the poll budget`);
}

/** Generates a still image from a text prompt (AI Image Usage). */
export async function generateImage(prompt: string, options: HiggsfieldOptions): Promise<HiggsfieldResult> {
  const jobId = await submitJob("/images/generate", { prompt }, options);
  const url = await pollJob(jobId, options);
  return { provider: "higgsfield", url, credit: "AI-generated image via Higgsfield" };
}

/** Generates a short video clip from a text prompt (AI Video Usage). */
export async function generateVideo(prompt: string, options: HiggsfieldOptions): Promise<HiggsfieldResult> {
  const jobId = await submitJob("/videos/generate", { prompt }, options);
  const url = await pollJob(jobId, options);
  return { provider: "higgsfield", url, credit: "AI-generated video via Higgsfield" };
}
