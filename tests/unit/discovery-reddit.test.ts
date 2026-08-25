import { describe, it, expect, vi } from "vitest";
import { fetchTopHotPost, fetchBestHotPost } from "../../services/discovery/reddit.js";

function redditResponse(posts: Array<{ title: string; ups: number; num_comments: number; permalink: string; stickied?: boolean }>) {
  return {
    ok: true,
    json: async () => ({ data: { children: posts.map((p) => ({ data: p })) } }),
    text: async () => "",
  };
}

describe("fetchTopHotPost", () => {
  it("returns the highest-upvoted non-stickied post", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      redditResponse([
        { title: "Pinned rules", ups: 99999, num_comments: 0, permalink: "/r/Scams/pinned", stickied: true },
        { title: "Watch out for this scam", ups: 500, num_comments: 42, permalink: "/r/Scams/abc" },
        { title: "Lower post", ups: 10, num_comments: 1, permalink: "/r/Scams/xyz" },
      ]),
    ) as unknown as typeof fetch;

    const post = await fetchTopHotPost("Scams", fetchImpl);

    expect(post).toEqual({
      subreddit: "Scams",
      title: "Watch out for this scam",
      url: "https://www.reddit.com/r/Scams/abc",
      upvotes: 500,
      numComments: 42,
    });
    const [url, options] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toBe("https://www.reddit.com/r/Scams/hot.json?limit=5");
    expect((options as RequestInit & { headers: Record<string, string> }).headers["User-Agent"]).toBeTruthy();
  });

  it("returns null when there are no eligible posts", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(redditResponse([])) as unknown as typeof fetch;
    expect(await fetchTopHotPost("EmptySub", fetchImpl)).toBeNull();
  });

  it("throws a descriptive error on a failed fetch", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" }) as unknown as typeof fetch;
    await expect(fetchTopHotPost("Scams", fetchImpl)).rejects.toThrow(/Reddit fetch failed/);
  });
});

describe("fetchBestHotPost", () => {
  it("picks the highest-upvoted post across multiple subreddits", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(redditResponse([{ title: "A", ups: 100, num_comments: 5, permalink: "/r/A/1" }]))
      .mockResolvedValueOnce(redditResponse([{ title: "B", ups: 900, num_comments: 5, permalink: "/r/B/1" }]));

    const post = await fetchBestHotPost(["A", "B"], fetchImpl as unknown as typeof fetch);
    expect(post?.title).toBe("B");
  });

  it("returns null when every subreddit is empty", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(redditResponse([])) as unknown as typeof fetch;
    expect(await fetchBestHotPost(["A", "B"], fetchImpl)).toBeNull();
  });
});
