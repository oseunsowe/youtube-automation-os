import { describe, it, expect, vi } from "vitest";
import { AirtableClient } from "../../services/airtable/client.js";
import { fieldsToVideoJob, findJobsToStart, setStatus, VIDEO_STATUS } from "../../services/airtable/index.js";

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
    expect(job).toEqual({
      videoId: "rec1",
      title: "T",
      category: "history",
      runtimeMinutes: 5,
      voice: "en-US-AndrewNeural",
      visualStyle: "documentary",
    });
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
});
