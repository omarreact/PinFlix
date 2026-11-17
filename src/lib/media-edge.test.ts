import { afterEach, describe, expect, it, vi } from "vitest";
import { isMediaEdgeUrl, resolveMediaEdgeStreams } from "./media-edge";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("TV CDN playback sources", () => {
  it("resolves the requested episode and preserves signed CDN URLs and HLS protocol", async () => {
    vi.stubEnv("PINFLIX_MEDIA_API_URL", "https://api.example.com");
    vi.stubEnv("PINFLIX_MEDIA_CDN_ORIGINS", "https://cdn.example.com");
    const signed = "https://cdn.example.com/play/episode?sig=abc&exp=123";
    const fetcher = vi.fn().mockResolvedValue(Response.json({ sources: [
      { url: signed, protocol: "hls", label: "1080p" },
      { url: "https://untrusted.example.com/video.mp4" },
    ] }));
    vi.stubGlobal("fetch", fetcher);
    const sources = await resolveMediaEdgeStreams("mb-123~show", { season: 2, episode: 4 });
    const requested = new URL(fetcher.mock.calls[0][0]);
    expect(requested.searchParams.get("key")).toBe("tv:123:s2e4");
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ url: signed, protocol: "hls" });
  });

  it("requires an explicit HTTPS origin and rejects lookalike hosts and credentials", () => {
    vi.stubEnv("PINFLIX_MEDIA_API_URL", "https://api.example.com");
    vi.stubEnv("PINFLIX_MEDIA_CDN_ORIGINS", "https://cdn.example.com, invalid, http://insecure.example.com");
    expect(isMediaEdgeUrl("https://api.example.com/video.mp4")).toBe(true);
    expect(isMediaEdgeUrl("https://cdn.example.com/video.mp4")).toBe(true);
    for (const url of ["https://cdn.example.com.evil.com/a.mp4", "http://cdn.example.com/a.mp4", "https://cdn.example.com:8443/a.mp4", "https://user:pass@cdn.example.com/a.mp4", "http://insecure.example.com/a.mp4"]) {
      expect(isMediaEdgeUrl(url)).toBe(false);
    }
  });
});
