import { afterEach, describe, expect, it, vi } from "vitest";
import {
  gatewaySearchPage,
  gatewayStreams,
  resolveGatewayStreamUrl,
} from "./gateway";

const previousGateway = process.env.CINEPLEX_GATEWAY_URL;

afterEach(() => {
  if (previousGateway === undefined) delete process.env.CINEPLEX_GATEWAY_URL;
  else process.env.CINEPLEX_GATEWAY_URL = previousGateway;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function gatewayTitle(
  id = "movie-40571",
  title = "Inception",
  kind: "movie" | "series" = "movie",
) {
  return {
    id,
    providerId: id.split("-")[1],
    kind,
    title,
    poster: null,
    backdrop: null,
    year: 2010,
    category: "English",
    language: "English",
    quality: "1080p",
    rating: "8.8",
    synopsis: "",
    genres: ["Sci-Fi"],
    cast: [],
    seasons: kind === "series" ? [1, 2] : [],
    country: null,
  };
}

describe("Cineplex EBN gateway", () => {
  it("only resolves signed stream paths inside the configured gateway mount", () => {
    process.env.CINEPLEX_GATEWAY_URL =
      "http://test.pincodeit.com/ebn-host-live";

    expect(
      resolveGatewayStreamUrl(
        "/api/stream/?id=movie-40571&exp=123&sig=" + "a".repeat(64),
      )?.toString(),
    ).toBe(
      "http://test.pincodeit.com/ebn-host-live/api/stream/?id=movie-40571&exp=123&sig=" +
        "a".repeat(64),
    );

    expect(
      resolveGatewayStreamUrl("https://evil.example/api/stream/?x=1"),
    ).toBeNull();
    expect(
      resolveGatewayStreamUrl(
        "http://test.pincodeit.com/ebn-host-live/api/catalogue/?x=1",
      ),
    ).toBeNull();
  });

  it("maps live movie and series catalogue records into cb provider IDs", async () => {
    process.env.CINEPLEX_GATEWAY_URL =
      "http://test.pincodeit.com/ebn-host-live";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = new URL(String(input));
        const isSeries = url.searchParams.get("kind") === "series";
        return Response.json({
          items: [
            isSeries
              ? gatewayTitle("series-10527", "Loki", "series")
              : gatewayTitle(),
          ],
          categories: [],
          hasNext: false,
          page: 1,
          stale: false,
          offlineMode: false,
        });
      }),
    );

    const page = await gatewaySearchPage("test", 1, "all");
    expect(page.items.map((item) => [item.id, item.kind])).toEqual([
      ["cb-movie-40571", "movie"],
      ["cb-series-10527", "show"],
    ]);
  });

  it("does not expose the EBN dated snapshot as a live Cineplex search result", async () => {
    process.env.CINEPLEX_GATEWAY_URL =
      "http://test.pincodeit.com/ebn-host-live";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          items: [gatewayTitle()],
          categories: [],
          hasNext: false,
          page: 1,
          stale: true,
          offlineMode: false,
        }),
      ),
    );

    expect((await gatewaySearchPage("Inception", 1, "movie")).items).toEqual([]);
  });

  it("wraps only validated EBN playback URLs in the same-origin PinFlix relay", async () => {
    process.env.CINEPLEX_GATEWAY_URL =
      "http://test.pincodeit.com/ebn-host-live";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: "ready",
          message: "",
          format: "hls",
          url:
            "/api/stream/?id=series-10527&season=1&episode=1&url=" +
            encodeURIComponent("http://cineplexbd.net/hls/t/loki/master.m3u8") +
            "&exp=1799999999999&sig=" +
            "a".repeat(64),
        }),
      ),
    );

    const streams = await gatewayStreams("cb-series-10527", {
      season: 1,
      episode: 1,
    });

    expect(streams).toHaveLength(1);
    expect(streams[0].protocol).toBe("hls");
    expect(streams[0].url).toContain("/api/proxy-cineplex-gateway?path=");
  });
});
