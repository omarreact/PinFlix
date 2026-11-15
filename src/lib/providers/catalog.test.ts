import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  moviebox: {
    canHandleId: vi.fn((id: string) => id.startsWith("mb-")),
    search: vi.fn(),
    searchPage: vi.fn(),
    getLatestPage: vi.fn(),
    getCategories: vi.fn(),
    getCategoryPage: vi.fn(),
    getDetails: vi.fn(),
    getSeriesNavigation: vi.fn(),
    resolveStreams: vi.fn(),
  },
}));

vi.mock("./moviebox/web", () => mocks.moviebox);

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

describe("MovieBox-only catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.moviebox.search.mockResolvedValue([movieboxTitle]);
    mocks.moviebox.searchPage.mockResolvedValue({
      items: [movieboxTitle],
      page: 1,
      hasNextPage: true,
    });
    mocks.moviebox.getLatestPage.mockResolvedValue({
      items: [movieboxTitle],
      page: 1,
      hasNextPage: false,
    });
    mocks.moviebox.getCategories.mockResolvedValue([]);
    mocks.moviebox.getCategoryPage.mockResolvedValue(null);
    mocks.moviebox.getDetails.mockResolvedValue(movieboxTitle);
    mocks.moviebox.getSeriesNavigation.mockResolvedValue({
      seasons: [1],
      season: 1,
      episodes: 8,
    });
    mocks.moviebox.resolveStreams.mockResolvedValue([
      {
        url: "https://cdn.aoneroom.com/example.mp4",
        quality: "MovieBox 1080p",
        protocol: "native",
        priority: 1080,
      },
    ]);
  });

  it("accepts MovieBox IDs and rejects non-MovieBox provider IDs", () => {
    expect(catalogProvider.name).toBe("moviebox");
    expect(catalogProvider.canHandleId("mb-1~example")).toBe(true);
    expect(catalogProvider.canHandleId("cb-movie-10")).toBe(false);
    expect(catalogProvider.canHandleId("tmdb-movie-10")).toBe(false);
  });

  it("routes search exclusively through MovieBox", async () => {
    const result = await catalogProvider.searchPage!("Example", 1, "all");

    expect(mocks.moviebox.searchPage).toHaveBeenCalledWith("Example", 1, "all");
    expect(result.items.map((item) => item.id)).toEqual(["mb-1~example"]);
    expect(result.hasNextPage).toBe(true);
  });

  it("routes details, navigation and playback directly through MovieBox", async () => {
    await expect(catalogProvider.getDetails("mb-1~example")).resolves.toEqual(
      movieboxTitle,
    );
    await expect(
      catalogProvider.getSeriesNavigation("mb-1~example", 1),
    ).resolves.toMatchObject({ season: 1, episodes: 8 });

    const streams = await catalogProvider.resolveStreams("mb-1~example");
    expect(mocks.moviebox.resolveStreams).toHaveBeenCalledWith(
      "mb-1~example",
      {},
    );
    expect(streams[0]?.quality).toBe("MovieBox 1080p");
  });
});
