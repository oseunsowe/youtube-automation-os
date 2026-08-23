import { describe, it, expect, vi } from "vitest";
import { getAccessToken, initiateResumableUpload } from "../../services/youtube/upload.js";

describe("getAccessToken", () => {
  it("posts a refresh_token grant and returns the access token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "abc123" }),
      text: async () => "",
    }) as unknown as typeof fetch;

    const token = await getAccessToken(
      { clientId: "id", clientSecret: "secret", refreshToken: "refresh" },
      fetchImpl,
    );

    expect(token).toBe("abc123");
    const [url, options] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const body = String((options as RequestInit).body);
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=refresh");
  });

  it("throws when the token response has no access_token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
      text: async () => "",
    }) as unknown as typeof fetch;

    await expect(
      getAccessToken({ clientId: "id", clientSecret: "secret", refreshToken: "refresh" }, fetchImpl),
    ).rejects.toThrow(/missing access_token/);
  });
});

describe("initiateResumableUpload", () => {
  it("sends video metadata and returns the resumable upload Location header", async () => {
    const headers = new Map([["location", "https://upload.example/session123"]]);
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (key: string) => headers.get(key.toLowerCase()) ?? null },
      text: async () => "",
    }) as unknown as typeof fetch;

    const location = await initiateResumableUpload(
      "token123",
      { title: "My Video", description: "desc" },
      12345,
      fetchImpl,
    );

    expect(location).toBe("https://upload.example/session123");
    const [url, options] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("uploadType=resumable");
    expect((options as RequestInit & { headers: Record<string, string> }).headers.Authorization).toBe(
      "Bearer token123",
    );
    const body = JSON.parse(String((options as RequestInit).body));
    expect(body.snippet.title).toBe("My Video");
    expect(body.status.privacyStatus).toBe("private");
  });
});
