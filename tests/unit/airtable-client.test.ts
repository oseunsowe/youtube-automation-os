import { describe, it, expect, vi } from "vitest";
import { AirtableClient } from "../../services/airtable/client.js";
import {
  fieldsToVideoJob,
  findJobsToStart,
  findJobsByStatus,
  setStatus,
  recordMediaAsset,
  VIDEO_STATUS,
} from "../../services/airtable/index.js";
import type { MediaAsset } from "../../services/common/types.js";

describe("AirtableClient", () => {
  it("lists records with a filterByFormula query param", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ records: [{ id: "rec1", fields: { Title: "Test" } }] }),
      text: async () => "",
    }) as unknown as typeof fetch;

    const client = new AirtableClient("key", "base123", fetchImpl);
    const records = await client.listRecords("Videos", "{Status}='Start'");

    expect(records).toHaveLength(1);
    const [url] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("api.airtable.com/v0/base123/Videos");
    expect(url).toContain("filterByFormula=");
  });

  it("PATCHes fields on updateRecord", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, text: async () => "" }) as unknown as typeof fetch;
    const client = new AirtableClient("key", "base123", fetchImpl);
    await client.updateRecord("Videos", "rec1", { Status: "Rendering" });

    const [url, options] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.airtable.com/v0/base123/Videos/rec1");
    expect((options as RequestInit).method).toBe("PATCH");
    expect(JSON.parse(String((options as RequestInit).body))).toEqual({ fields: { Status: "Rendering" } });
  });

  it("throws a descriptive error on a failed request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "invalid field",
    }) as unknown as typeof fetch;
    const client = new AirtableClient("key", "base123", fetchImpl);
    await expect(client.listRecords("Videos")).rejects.toThrow(/422/);
  });
});

describe("fieldsToVideoJob", () => {
  it("maps Airtable fields to a VideoJob with defaults", () => {
    const job = fieldsToVideoJob("rec1", { Title: "T", Category: "history", Status: "Start" });
    expect(job.videoId).toBe("rec1");
    expect(job.title).toBe("T");
    expect(job.category).toBe("history");
    expect(job.runtimeMinutes).toBe(5);
    expect(job.voice).toBe("en-US-AndrewNeural");
    expect(job.visualStyle).toBe("documentary");
    expect(job.production.sceneDensity).toBe("medium");
    expect(job.production.renderProvider).toBe("remotion");
    expect(job.production.requireScriptApproval).toBe(true);
    expect(job.production.requireFinalApproval).toBe(true);
    expect(job.production.visualPriorities).toEqual({
      stockFootage: true,
      archive: true,
      map: false,
      document: false,
      chart: false,
      screenshot: false,
      aiImage: false,
      aiVideo: false,
    });
  });

  it("prefers explicit field values over defaults", () => {
    const job = fieldsToVideoJob("rec1", {
      Title: "T",
      Category: "history",
      Status: "Start",
      "Target Runtime": 12,
      "Scene Density": "high",
      "Render Provider": "json2video",
      "Require Script Approval": false,
      "Document Usage": true,
    });
    expect(job.runtimeMinutes).toBe(12);
    expect(job.production.sceneDensity).toBe("high");
    expect(job.production.renderProvider).toBe("json2video");
    expect(job.production.requireScriptApproval).toBe(false);
    expect(job.production.visualPriorities.document).toBe(true);
  });
});

describe("findJobsToStart / setStatus", () => {
  it("filters by the Start status and maps records to jobs", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        records: [{ id: "rec1", fields: { Title: "T", Category: "history", Status: "Start" } }],
      }),
      text: async () => "",
    }) as unknown as typeof fetch;

    const client = new AirtableClient("key", "base123", fetchImpl);
    const jobs = await findJobsToStart(client, "Videos");

    expect(jobs).toHaveLength(1);
    expect(jobs[0].videoId).toBe("rec1");
    const [url] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(decodeURIComponent(url)).toContain(`{Status}='${VIDEO_STATUS.START}'`);
  });

  it("setStatus updates only the Status field plus any extras", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, text: async () => "" }) as unknown as typeof fetch;
    const client = new AirtableClient("key", "base123", fetchImpl);
    await setStatus(client, "Videos", "rec1", VIDEO_STATUS.RENDERING, { "Scene Count": 4 });

    const [, options] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(String((options as RequestInit).body))).toEqual({
      fields: { Status: "Rendering", "Scene Count": 4 },
    });
  });

  it("findJobsByStatus applies an arbitrary formula, e.g. the approval-gate filters", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        records: [{ id: "rec1", fields: { Title: "T", Category: "history", Status: "Script Review" } }],
      }),
      text: async () => "",
    }) as unknown as typeof fetch;

    const client = new AirtableClient("key", "base123", fetchImpl);
    const formula = "AND({Status}='Script Review', {Script Approved}=1)";
    const jobs = await findJobsByStatus(client, "Videos", formula);

    expect(jobs).toHaveLength(1);
    const [url] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(decodeURIComponent(url.replace(/\+/g, " "))).toContain(formula);
  });
});

describe("recordMediaAsset", () => {
  it("writes a Media Assets row linked to the video record", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "recAsset1", fields: {} }),
      text: async () => "",
    }) as unknown as typeof fetch;

    const client = new AirtableClient("key", "base123", fetchImpl);
    const asset: MediaAsset = {
      assetId: "vid1-scene-01",
      sceneId: "scene-01",
      videoId: "vid1",
      sourceProvider: "pexels",
      sourceUrl: "https://images.pexels.com/photo.jpg",
      license: "Pexels License",
      attribution: "Photo by Jane Doe on Pexels",
      downloadDate: "2026-01-01T00:00:00.000Z",
      localPath: "/data/vid1/assets/scene-01.jpg",
      usageStatus: "approved",
    };

    await recordMediaAsset(client, "Media Assets", "recVideo1", asset);

    const [url, options] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("Media%20Assets");
    const body = JSON.parse(String((options as RequestInit).body));
    expect(body.fields.Video).toEqual(["recVideo1"]);
    expect(body.fields["Scene ID"]).toBe("scene-01");
    expect(body.fields["Usage Status"]).toBe("approved");
  });
});
