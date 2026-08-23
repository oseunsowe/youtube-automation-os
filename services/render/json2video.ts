import { writeFile } from "node:fs/promises";
import type { Scene } from "../common/types.js";

/**
 * JSON2Video v2 movie-definition mapping and API calls. Written from general
 * knowledge of their REST API (POST /v2/movies to start a render, GET
 * /v2/movies?project=id to poll status) -- there's no account to verify this
 * against from here, so treat this as a starting point and re-check against
 * https://json2video.com/docs/ the first time RENDER_PROVIDER=json2video is
 * actually used.
 */

export interface Json2VideoElement {
  type: "video" | "image" | "audio" | "text";
  src?: string;
  text?: string;
  duration?: number;
}

export interface Json2VideoScene {
  elements: Json2VideoElement[];
}

export interface Json2VideoMovie {
  resolution: "custom";
  width: number;
  height: number;
  quality: "high";
  scenes: Json2VideoScene[];
}

/** Maps our Scene JSON (same schema regardless of renderer, per Update 3) to a JSON2Video movie definition. */
export function scenesToMovieDefinition(
  scenes: Scene[],
  dimensions: { width: number; height: number } = { width: 1920, height: 1080 },
): Json2VideoMovie {
  return {
    resolution: "custom",
    width: dimensions.width,
    height: dimensions.height,
    quality: "high",
    scenes: scenes.map((scene) => {
      const elements: Json2VideoElement[] = [];

      if (scene.assetPath && (scene.visualType === "stock_video")) {
        elements.push({ type: "video", src: scene.assetPath, duration: scene.durationSeconds });
      } else if (scene.assetPath) {
        elements.push({ type: "image", src: scene.assetPath, duration: scene.durationSeconds });
      } else {
        elements.push({
          type: "text",
          text: scene.overlayText ?? scene.narration,
          duration: scene.durationSeconds,
        });
      }

      if (scene.audioPath) {
        elements.push({ type: "audio", src: scene.audioPath });
      }

      return { elements };
    }),
  };
}

export async function createMovie(
  movie: Json2VideoMovie,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl("https://api.json2video.com/v2/movies", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(movie),
  });
  if (!res.ok) {
    throw new Error(`JSON2Video create movie failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { success?: boolean; project?: string };
  if (!data.project) throw new Error("JSON2Video response missing project id");
  return data.project;
}

export interface Json2VideoStatus {
  status: "pending" | "running" | "done" | "error";
  url?: string;
}

export async function pollMovieStatus(
  projectId: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Json2VideoStatus> {
  const res = await fetchImpl(`https://api.json2video.com/v2/movies?project=${encodeURIComponent(projectId)}`, {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) {
    throw new Error(`JSON2Video status check failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { movie?: Json2VideoStatus };
  if (!data.movie) throw new Error("JSON2Video status response missing movie");
  return data.movie;
}

export interface RenderWithJson2VideoOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export async function renderWithJson2Video(
  scenes: Scene[],
  outPath: string,
  options: RenderWithJson2VideoOptions,
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const pollIntervalMs = options.pollIntervalMs ?? 5000;
  const maxPollAttempts = options.maxPollAttempts ?? 120;

  const movie = scenesToMovieDefinition(scenes);
  const projectId = await createMovie(movie, options.apiKey, fetchImpl);

  for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
    const status = await pollMovieStatus(projectId, options.apiKey, fetchImpl);
    if (status.status === "error") {
      throw new Error(`JSON2Video render failed for project ${projectId}`);
    }
    if (status.status === "done" && status.url) {
      const res = await fetchImpl(status.url);
      if (!res.ok) throw new Error(`Failed to download JSON2Video output: ${res.status}`);
      await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
      return outPath;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`JSON2Video render for project ${projectId} did not finish within the poll budget`);
}
