import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchHtml: vi.fn(),
  fetchJson: vi.fn(),
}));

vi.mock("./api", () => ({
  CINEPLEX_BASE_URL: "http://cineplexbd.net",
  fetchHtml: mocks.fetchHtml,
  fetchJson: mocks.fetchJson,
}));

vi.mock("./categories", () => ({
  getCineplexCategories: vi.fn().mockResolvedValue([]),
  getCineplexCategory: vi.fn().mockResolvedValue(null),
  getCineplexTaxonomy: vi.fn().mockResolvedValue({
    source: "test",
    categories: [],
    navigation: [],
  }),
}));

import { cineplexbdProvider } from "./index";

describe("CineplexBD search coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchJson.mockResolvedValue({
      results: [
        {
          id: 31392,
          type: "series",
          title: "Killer Cakes",
          year: 2024,
          category: "English Series",
          poster: "/uploads/killer-cakes.jpg",
        },
      ],
    });
    mocks.fetchHtml.mockResolvedValue(
      '<a href="/view.php?id=77533"><img alt="Drawn Together" src="/uploads/drawn.jpg"><div class="title">Drawn Together</div><p>Comedy</p><span>2026</span></a>',
    );
  });

  it("merges JSON suggestions with native HTML search results", async () => {
    const page = await cineplexbdProvider.searchPage!("Drawn", 1, "all");

    expect(page.items.map((item) => [item.id, item.kind])).toEqual([
      ["cb-series-31392", "show"],
      ["cb-movie-77533", "movie"],
    ]);
    expect(mocks.fetchJson).toHaveBeenCalledWith(
      "/search_ajax.php?q=Drawn&limit=80",
      60,
    );
  });

  it("filters the combined result set by requested media type", async () => {
    const shows = await cineplexbdProvider.searchPage!("Killer", 1, "show");
    expect(shows.items.map((item) => item.id)).toEqual(["cb-series-31392"]);
  });

  it("uses paginated HTML search without repeating the non-paginated JSON suggestions", async () => {
    const page = await cineplexbdProvider.searchPage!("Drawn", 2, "movie");
    expect(page.items.map((item) => item.id)).toEqual(["cb-movie-77533"]);
    expect(mocks.fetchJson).not.toHaveBeenCalled();
    expect(mocks.fetchHtml).toHaveBeenCalledWith(
      "/search.php?q=Drawn&page=2",
      60,
    );
  });
});
