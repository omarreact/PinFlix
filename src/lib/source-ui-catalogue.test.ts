import { beforeEach, describe, expect, it, vi } from "vitest";
const { getLatestPage, searchLibrary } = vi.hoisted(() => ({
  getLatestPage: vi.fn(),
  searchLibrary: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/providers/catalog", () => ({
  catalogProvider: { getLatestPage },
}));
vi.mock("@/src/lib/search-service", () => ({ searchLibrary }));
import { sourceCatalogue } from "./source-ui-catalogue";
import { toSavedTitle, toTitle, titleHref } from "./source-ui";
import type { Entertainment } from "@/src/types/catalog";
const movie: Entertainment = {
  id: "mb-123~example",
  slug: "mb-123~example",
  title: "Example",
  kind: "movie",
  year: 2021,
  genres: ["Action"],
  poster: "https://images.example/poster.jpg",
  backdrop: "",
  synopsis: "A story",
  languages: ["English"],
};
beforeEach(() => {
  vi.resetAllMocks();
  getLatestPage.mockResolvedValue({
    items: [movie],
    page: 1,
    hasNextPage: true,
  });
});
describe("source UI provider adapter", () => {
  it("keeps existing TMDB saved entries on metadata routes", () => {
    expect(titleHref({ id: "tmdb-tv-84958" })).toBe("/title/tv/84958");
    expect(titleHref({ id: "tmdb-movie-27205" })).toBe("/title/movie/27205");
  });
  it("preserves provider identity and saved entries across the presentation mapping", () => {
    const adapted = toTitle({ ...movie, kind: "show" });
    expect(adapted.kind).toBe("series");
    expect(toSavedTitle(adapted)).toMatchObject({
      id: movie.id,
      slug: movie.id,
      kind: "show",
      title: movie.title,
    });
    expect(titleHref(adapted)).toBe(`/entertainment/${movie.id}`);
  });
  it("supports collection labels, real languages, page bounds and public-only catalogue results", async () => {
    getLatestPage.mockResolvedValue({
      items: [movie, { ...movie, id: "mb-456~adult", genres: ["Adult"] }],
      page: 100,
      hasNextPage: true,
    });
    const result = await sourceCatalogue(
      new URLSearchParams({
        kind: "movie",
        category: "Action",
        language: "English",
        page: "9999",
      }),
    );
    expect(getLatestPage).toHaveBeenCalledWith("movie", 100);
    expect(result.items.map((item) => item.id)).toEqual([movie.id]);
    expect(result.hasNext).toBe(true);
    expect(result.years).toContain(1900);
    expect(result.years).toContain(2021);
  });
  it("sends title/year searches through the existing search service", async () => {
    searchLibrary.mockResolvedValue({
      catalog: [movie],
      catalogHasMore: false,
      status: "ok",
    });
    const result = await sourceCatalogue(
      new URLSearchParams({ q: "Example 2021", kind: "series", page: "2" }),
    );
    expect(searchLibrary).toHaveBeenCalledWith({
      query: "Example 2021",
      kind: "show",
      year: null,
      page: 2,
    });
    expect(getLatestPage).not.toHaveBeenCalled();
    expect(result.items).toEqual([]); // Movie result must not enter the series view.
  });
  it("builds separate publisher collections from real provider searches and deduplicates IDs", async () => {
    const marvel = {
      ...movie,
      id: "mb-789~avengers",
      title: "Avengers: Endgame",
      year: 2019,
    };
    const dc = {
      ...movie,
      id: "mb-456~batman",
      title: "The Batman",
      year: 2022,
    };
    searchLibrary.mockResolvedValue({
      catalog: [marvel, dc],
      catalogHasMore: true,
      status: "ok",
    });
    const result = await sourceCatalogue(
      new URLSearchParams({ category: "Marvel", page: "2" }),
    );
    expect(result.items.map((item) => item.id)).toEqual([marvel.id]);
    expect(result.hasNext).toBe(true);
    expect(searchLibrary).toHaveBeenCalledWith({
      query: "Avengers",
      kind: "all",
      year: null,
      page: 2,
    });
    expect(getLatestPage).not.toHaveBeenCalled();
    const dcResult = await sourceCatalogue(
      new URLSearchParams({ category: "DC" }),
    );
    expect(dcResult.items.map((item) => item.id)).toEqual([dc.id]);
  });
  it("preserves upstream failures instead of turning them into empty search results", async () => {
    searchLibrary.mockResolvedValue({
      catalog: [],
      catalogHasMore: false,
      status: "unavailable",
    });
    await expect(
      sourceCatalogue(new URLSearchParams({ q: "Loki" })),
    ).rejects.toThrow("temporarily unavailable");
    getLatestPage.mockRejectedValue(new Error("offline"));
    await expect(sourceCatalogue(new URLSearchParams())).rejects.toThrow(
      "temporarily unavailable",
    );
  });
});
