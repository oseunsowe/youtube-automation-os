import { describe, it, expect, vi } from "vitest";
import { searchTrendingVideos } from "../../services/discovery/youtube.js";

const NOW = new Date("2026-08-24T00:00:00Z");

function mockSequence(...responses: unknown[]) {
  const fn = vi.fn();
  for (const body of responses) {
    fn.mockResolvedValueOnce({ ok: true, json: async () => body, text: async () => "" });
  }
  return fn as unknown as typeof fetch;
}

describe("searchTrendingVideos", () => {
  it("searches by keyword then fetches stats, computing views/day", async () => {
    const fetchImpl = mockSequence(
      { items: [{ id: { videoId: "vid1" } }] },
      {
        items: [
          {
            id: "vid1",
            snippet: { title: "Bank Scam Explained", publishedAt: "2026-08-22T00:00:00Z" },
            statistics: { viewCount: "20000" },
          },
        ],
      },
    );

    const results = await searchTrendingVideos("bank scam", 5, { apiKey: "test-key", fetchImpl, now: NOW });

    expect(results).toEqual([
      {
        videoId: "vid1",
        title: "Bank Scam Explained",
        url: "https://www.youtube.com/watch?v=vid1",
        viewCount: 20000,
        publishedAt: "2026-08-22T00:00:00Z",
        viewsPerDay: 10000,
      },
    ]);

    const [searchUrl] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(searchUrl)).toContain("q=bank+scam");
    expect(String(searchUrl)).toContain("key=test-key");
  });

  it("returns an empty array when the search finds nothing", async () => {
    const fetchImpl = mockSequence({ items: [] });
    const results = await searchTrendingVideos("obscure topic", 5, { apiKey: "test-key", fetchImpl, now: NOW });
    expect(results).toEqual([]);
  });

  it("throws a descriptive error when the search call fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 403, text: async () => "quota exceeded" }) as unknown as typeof fetch;

    await expect(
      searchTrendingVideos("bank scam", 5, { apiKey: "test-key", fetchImpl, now: NOW }),
    ).rejects.toThrow(/YouTube search failed/);
  });
});
