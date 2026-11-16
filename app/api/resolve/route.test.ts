import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { catalogProvider } from "@/src/lib/providers/catalog";

vi.mock("@/src/lib/providers/catalog", () => ({
  catalogProvider: {
    canHandleId: (id: string) => id.startsWith("mb-"),
    resolveStreams: vi.fn(),
  },
}));

afterEach(() => vi.resetAllMocks());

describe("MovieBox-only playback resolution", () => {
  it("passes the selected episode directly to MovieBox", async () => {
    vi.mocked(catalogProvider.resolveStreams).mockResolvedValue([
      {
        url: "https://cdn.aoneroom.com/s2e4.m3u8?sig=abc",
        protocol: "hls",
        quality: "MovieBox HLS 1080p",
        priority: 1080,
      },
    ]);

    const response = await GET(
      new Request(
        "https://pinflix.test/api/resolve?id=mb-123~show&season=2&episode=4",
      ),
    );

    expect(response.status).toBe(200);
    expect(catalogProvider.resolveStreams).toHaveBeenCalledWith(
      "mb-123~show",
      { season: 2, episode: 4 },
    );

    const payload = await response.json();
    expect(payload.provider).toBe("moviebox");
    expect(payload.mediaEdge).toEqual({
      enabled: false,
      matched: false,
      sourceCount: 0,
    });
    expect(payload.sources[0].url).toContain("/api/proxy-stream?");
  });

  it("rejects non-MovieBox provider IDs", async () => {
    const response = await GET(
      new Request("https://pinflix.test/api/resolve?id=cb-movie-10"),
    );
    expect(response.status).toBe(400);
    expect(catalogProvider.resolveStreams).not.toHaveBeenCalled();
  });

  it("returns 404 when MovieBox has no playable stream", async () => {
    vi.mocked(catalogProvider.resolveStreams).mockResolvedValue([]);
    const response = await GET(
      new Request("https://pinflix.test/api/resolve?id=mb-123~movie"),
    );
    expect(response.status).toBe(404);
  });

  it("keeps same-origin provider URLs unchanged", async () => {
    vi.mocked(catalogProvider.resolveStreams).mockResolvedValue([
      {
        url: "/api/provider-stream?id=mb-123",
        protocol: "native",
        quality: "MovieBox source",
        priority: 1,
      },
    ]);
    const response = await GET(
      new Request("https://pinflix.test/api/resolve?id=mb-123~movie"),
    );
    const source = (await response.json()).sources[0];
    expect(source.url).toBe("/api/provider-stream?id=mb-123");
  });
});
