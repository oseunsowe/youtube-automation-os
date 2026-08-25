import { describe, it, expect } from "vitest";
import {
  scoreViewVelocity,
  scoreRedditEngagement,
  combineOpportunityScore,
  buildRationale,
} from "../../services/discovery/score.js";

describe("scoreViewVelocity", () => {
  it("returns 0 for no views", () => {
    expect(scoreViewVelocity(0)).toBe(0);
  });

  it("scores a breakout video (near the cap) close to 100", () => {
    expect(scoreViewVelocity(50_000)).toBeGreaterThanOrEqual(99);
  });

  it("never exceeds 100 even far past the cap", () => {
    expect(scoreViewVelocity(5_000_000)).toBe(100);
  });

  it("scores a modest video (100 views/day) well below a breakout one", () => {
    const modest = scoreViewVelocity(100);
    const breakout = scoreViewVelocity(50_000);
    expect(modest).toBeGreaterThan(0);
    expect(modest).toBeLessThan(breakout);
  });
});

describe("scoreRedditEngagement", () => {
  it("returns 0 for no engagement", () => {
    expect(scoreRedditEngagement(0, 0)).toBe(0);
  });

  it("weights comments more than upvotes", () => {
    const commentsHeavy = scoreRedditEngagement(0, 100);
    const upvotesHeavy = scoreRedditEngagement(100, 0);
    expect(commentsHeavy).toBeGreaterThan(upvotesHeavy);
  });

  it("caps at 100", () => {
    expect(scoreRedditEngagement(1_000_000, 1_000_000)).toBe(100);
  });
});

describe("combineOpportunityScore", () => {
  it("weights YouTube 55%, Reddit 30%, Trends 15%", () => {
    expect(combineOpportunityScore({ youtubeScore: 100, redditScore: 0, trendsScore: 0 })).toBe(55);
    expect(combineOpportunityScore({ youtubeScore: 0, redditScore: 100, trendsScore: 0 })).toBe(30);
    expect(combineOpportunityScore({ youtubeScore: 0, redditScore: 0, trendsScore: 100 })).toBe(15);
  });

  it("an unavailable Trends signal (score 0) still lets the max score reach 85, not 100", () => {
    expect(combineOpportunityScore({ youtubeScore: 100, redditScore: 100, trendsScore: 0 })).toBe(85);
  });
});

describe("buildRationale", () => {
  it("describes the YouTube signal and notes when Reddit/Trends are unavailable", () => {
    const rationale = buildRationale({
      youtube: { title: "Bank Scam Explained", viewsPerDay: 12345, daysAgo: 3 },
      trendsAvailable: false,
    });
    expect(rationale).toContain("Bank Scam Explained");
    expect(rationale).toContain("12,345 views/day");
    expect(rationale).toContain("no matching hot posts found");
    expect(rationale).toContain("Google Trends: unavailable");
  });

  it("includes the Reddit post when present", () => {
    const rationale = buildRationale({
      youtube: { title: "X", viewsPerDay: 100, daysAgo: 1 },
      reddit: { subreddit: "Scams", title: "Watch out for this", upvotes: 500, numComments: 42 },
      trendsAvailable: true,
    });
    expect(rationale).toContain("r/Scams");
    expect(rationale).toContain("500 upvotes, 42 comments");
    expect(rationale).toContain("Google Trends: signal included");
  });
});
