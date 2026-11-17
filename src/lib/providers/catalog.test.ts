import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const moviebox = {
    canHandleId: vi.fn((id: string) => id.startsWith("mb-")),
    searchPage: vi.fn(),
    getLatestPage: vi.fn(),
    getCategories: vi.fn(),
    getCategoryPage: vi.fn(),
    getDetails: vi.fn(),
    getSeriesNavigation: vi.fn(),
    resolveStreams: vi.fn(),
  };
  const cineplex = {
    name: "cineplexbd",
    canHandleId: vi.fn((id: string) => id.startsWith("cb-")),
    search: vi.fn(),
    searchPage: vi.fn(),
    getLatestPage: vi.fn(),
    getCategories: vi.fn(),
    getCategoryPage: vi.fn(),
    getDetails: vi.fn(),
    getSeriesNavigation: vi.fn(),
    resolveStreams: vi.fn(),
  };
  return { moviebox, cineplex };
});

vi.mock("./moviebox/web", () => mocks.moviebox);
vi.mock("./cineplexbd", () => ({ cineplexbdProvider: mocks.cineplex }));

import { catalogProvider } from "./catalog";

const movieboxTitle = {
  id: "mb-1~example",
  slug: "mb-1~example",
  title: "Example",
  kind: "movie" as const,
  year: 2025,
  genres: [],
  backdrop: "",
  poster: "",
  synopsis: "",
  provider: "moviebox",
};

const cineplexDuplicate = {
  ...movieboxTitle,
  id: "cb-movie-10",
  slug: "cb-movie-10",
  provider: "cineplexbd",
};

const cineplexExclusive = {
  ...movieboxTitle,
  id: "cb-movie-11",
  slug: "cb-movie-11",
  title: "Exclusive",
  provider: "cineplexbd",
};

describe("multi-provider catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.moviebox.searchPage.mockResolvedValue({
      items: [movieboxTitle],
      page: 1,
      hasNextPage: false,
    });
    mocks.cineplex.searchPage.mockResolvedValue({
      items: [cineplexDuplicate, cineplexExclusive],
      page: 1,
      hasNextPage: true,
    });
    mocks.cineplex.search.mockResolvedValue([cineplexDuplicate]);
    mocks.moviebox.getLatestPage.mockResolvedValue({
      items: [movieboxTitle],
      page: 1,
      hasNextPage: false,
    });
    mocks.moviebox.getCategories.mockResolvedValue([]);
    mocks.cineplex.getCategories.mockResolvedValue([]);
    mocks.moviebox.getCategoryPage.mockResolvedValue(null);
    mocks.cineplex.getCategoryPage.mockResolvedValue(null);
    mocks.moviebox.resolveStreams.mockResolvedValue([]);
    mocks.cineplex.resolveStreams.mockResolvedValue([
      {
        url: "/api/proxy-video?url=test",
        quality: "Cineplex source",
        protocol: "native",
        priority: 1,
      },
    ]);
    mocks.moviebox.getDetails.mockResolvedValue(movieboxTitle);
  });

  it("accepts both MovieBox and CineplexBD provider IDs", () => {
    expect(catalogProvider.canHandleId("mb-1~example")).toBe(true);
    expect(catalogProvider.canHandleId("cb-movie-10")).toBe(true);
  });

  it("supplements MovieBox search with CineplexBD and keeps MovieBox for duplicate works", async () => {
    const result = await catalogProvider.searchPage!("Example", 1, "all");

    expect(result.items.map((item) => item.id)).toEqual([
      "mb-1~example",
      "cb-movie-11",
    ]);
    expect(result.hasNextPage).toBe(true);
  });

  it("routes CineplexBD IDs directly to CineplexBD playback", async () => {
    const streams = await catalogProvider.resolveStreams("cb-movie-10");
    expect(mocks.cineplex.resolveStreams).toHaveBeenCalledWith(
      "cb-movie-10",
      {},
    );
    expect(streams).toHaveLength(1);
  });

  it("falls back from an unavailable MovieBox stream to the matching CineplexBD title", async () => {
    const streams = await catalogProvider.resolveStreams("mb-1~example");

    expect(mocks.moviebox.resolveStreams).toHaveBeenCalled();
    expect(mocks.cineplex.search).toHaveBeenCalledWith(
      "Example",
      1,
      "movie",
    );
    expect(mocks.cineplex.resolveStreams).toHaveBeenCalledWith(
      "cb-movie-10",
      {},
    );
    expect(streams[0]?.quality).toBe("Cineplex source");
  });
});
