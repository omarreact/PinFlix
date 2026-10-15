import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { catalogProvider } from "@/src/lib/providers/catalog";
import { resolveMediaEdgeStreams } from "@/src/lib/media-edge";

vi.mock("@/src/lib/providers/catalog", () => ({ catalogProvider: {
  canHandleId: (id: string) => id.startsWith("mb-"), resolveStreams: vi.fn(),
} }));
vi.mock("@/src/lib/media-edge", () => ({
  resolveMediaEdgeStreams: vi.fn(), isMediaEdgeUrl: (url: string) => url.startsWith("https://cdn.example.com/"),
}));
afterEach(() => vi.resetAllMocks());

describe("TV playback resolution", () => {
  it("retains CDN playback when the provider fails and passes the selected episode", async () => {
    vi.mocked(resolveMediaEdgeStreams).mockResolvedValue([
      { url: "https://cdn.example.com/s2e4.m3u8?sig=abc", protocol: "hls", quality: "1080p", priority: 10000 },
    ]);
    vi.mocked(catalogProvider.resolveStreams).mockRejectedValue(new Error("Provider unavailable"));
    const response = await GET(new Request("https://pinflix.test/api/resolve?id=mb-123~show&season=2&episode=4"));
    expect(response.status).toBe(200);
    expect(resolveMediaEdgeStreams).toHaveBeenCalledWith("mb-123~show", { season: 2, episode: 4 });
    expect(catalogProvider.resolveStreams).toHaveBeenCalledWith("mb-123~show", { season: 2, episode: 4 });
    expect((await response.json()).sources[0].url).toBe("https://cdn.example.com/s2e4.m3u8?sig=abc");
  });

  it("keeps the provider proxy fallback when the CDN resolver fails", async () => {
    vi.mocked(resolveMediaEdgeStreams).mockRejectedValue(new Error("CDN unavailable"));
    vi.mocked(catalogProvider.resolveStreams).mockResolvedValue([
      { url: "https://cdn.aoneroom.com/s2e4.mp4", protocol: "native", quality: "720p", priority: 720 },
    ]);
    const response = await GET(new Request("https://pinflix.test/api/resolve?id=mb-123~show&season=2&episode=4"));
    const source = (await response.json()).sources[0];
    const url = new URL(source.url, "https://pinflix.test");
    expect(url.pathname).toBe("/api/proxy-stream");
    expect(url.searchParams.get("season")).toBe("2");
    expect(url.searchParams.get("episode")).toBe("4");
  });
});
