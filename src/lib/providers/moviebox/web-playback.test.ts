import { afterEach, expect, it, vi } from "vitest";
import { getSeriesNavigation, resolveStreams } from "./web";

afterEach(() => vi.unstubAllGlobals());

it("loads real series seasons and nonconsecutive episodes from the detail API", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ code: 0, data: { resource: { seasons: [
    { se: 1, maxEp: 8 }, { se: 2, allEp: "5,2,2,invalid", maxEp: 5 },
  ] } } }));
  vi.stubGlobal("fetch", fetcher);
  expect(await getSeriesNavigation("mb-123~series", 2)).toEqual({ seasons: [1, 2], season: 2, episodes: 5, episodeNumbers: [2, 5] });
  expect(String(fetcher.mock.calls[0][0])).toBe("https://h5-api.aoneroom.com/wefeed-h5api-bff/detail?detailPath=series");
});

it("reports provider errors instead of inventing a playable episode", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: 1, data: null })));
  await expect(getSeriesNavigation("mb-123~series", 2)).rejects.toThrow("unavailable");
});

it("resolves the selected series episode with its provider referer", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ code: 0, data: {
    streams: [{ url: "https://cdn.aoneroom.com/episode.mp4", resolutions: 720 }],
    hls: [{ url: "https://cdn.aoneroom.com/episode.m3u8", resolutions: 1080 }],
  } }));
  vi.stubGlobal("fetch", fetcher);
  const sources = await resolveStreams("mb-123~series", { season: 2, episode: 4 });
  const requested = new URL(fetcher.mock.calls[0][0]);
  expect(requested.pathname).toBe("/wefeed-h5api-bff/subject/play");
  expect(Object.fromEntries(requested.searchParams)).toMatchObject({ subjectId: "123", se: "2", ep: "4", detailPath: "series" });
  const referer = new URL(fetcher.mock.calls[0][1].headers.get("Referer"));
  expect(referer.searchParams.get("detailSe")).toBe("2");
  expect(referer.searchParams.get("detailEp")).toBe("4");
  expect(sources.map((source) => source.protocol)).toEqual(["hls", "native"]);
});
