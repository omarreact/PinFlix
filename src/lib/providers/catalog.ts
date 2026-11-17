import * as movieboxWeb from "./moviebox/web";
import { cineplexbdProvider } from "./cineplexbd";
import type {
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  SeriesNavigation,
} from "./contracts";
import { titlesIdentifySameWork } from "@/src/lib/title-match-utils";
import type { Entertainment, StreamSource } from "@/src/types/catalog";

function mergeProviderItems(
  primary: Entertainment[],
  fallback: Entertainment[],
): Entertainment[] {
  const merged = [...primary];

  for (const item of fallback) {
    if (
      merged.some(
        (candidate) =>
          candidate.id === item.id || titlesIdentifySameWork(candidate, item),
      )
    ) {
      continue;
    }
    merged.push(item);
  }

  return merged;
}

async function searchCineplexPage(
  query: string,
  page: number,
  kind: "all" | "movie" | "show",
): Promise<ProviderCatalogPage> {
  if (cineplexbdProvider.searchPage) {
    return cineplexbdProvider.searchPage(query, page, kind);
  }

  const items = await cineplexbdProvider.search(query, page, kind);
  return {
    items,
    page,
    hasNextPage: items.length >= 30,
  };
}

async function searchAllProviders(
  query: string,
  page = 1,
  kind: "all" | "movie" | "show" = "all",
): Promise<ProviderCatalogPage> {
  const [movieboxResult, cineplexResult] = await Promise.allSettled([
    movieboxWeb.searchPage(query, page, kind),
    searchCineplexPage(query, page, kind),
  ]);

  if (
    movieboxResult.status === "rejected" &&
    cineplexResult.status === "rejected"
  ) {
    throw movieboxResult.reason;
  }

  const moviebox =
    movieboxResult.status === "fulfilled"
      ? movieboxResult.value
      : { items: [], page, hasNextPage: false };
  const cineplex =
    cineplexResult.status === "fulfilled"
      ? cineplexResult.value
      : { items: [], page, hasNextPage: false };

  return {
    items: mergeProviderItems(moviebox.items, cineplex.items),
    page,
    hasNextPage: moviebox.hasNextPage || cineplex.hasNextPage,
  };
}

async function resolveMovieBoxWithCineplexFallback(
  id: string,
  options: { season?: number; episode?: number } = {},
): Promise<StreamSource[]> {
  const primary = await movieboxWeb.resolveStreams(id, options);
  if (primary.length) return primary;

  const details = await movieboxWeb.getDetails(id);
  if (!details?.title) return [];

  const candidates = await cineplexbdProvider.search(
    details.title,
    1,
    details.kind,
  );
  const match = candidates.find((candidate) =>
    titlesIdentifySameWork(details, candidate),
  );
  if (!match) return [];

  return cineplexbdProvider.resolveStreams(match.id, options);
}

/**
 * PinFlix keeps MovieBox as the primary provider while adding CineplexBD as a
 * secondary source for search/catalog recovery and playback fallback.
 *
 * Provider-issued IDs remain intact:
 * - mb-* routes to MovieBox
 * - cb-* routes to CineplexBD
 */
export const catalogProvider: PinFlixProvider = {
  name: "moviebox+cineplexbd",

  canHandleId(id) {
    return movieboxWeb.canHandleId(id) || cineplexbdProvider.canHandleId(id);
  },

  async search(query, page = 1, kind = "all") {
    return (await searchAllProviders(query, page, kind)).items;
  },

  searchPage: searchAllProviders,

  async getLatestPage(kind, page = 1) {
    try {
      const moviebox = await movieboxWeb.getLatestPage(kind, page);
      if (moviebox.items.length) return moviebox;
    } catch (error) {
      console.warn("MovieBox catalogue unavailable; trying CineplexBD.", error);
    }

    return cineplexbdProvider.getLatestPage(kind, page);
  },

  async getCategories(kind) {
    const [moviebox, cineplex] = await Promise.allSettled([
      movieboxWeb.getCategories(kind),
      cineplexbdProvider.getCategories(kind),
    ]);
    const merged = new Map<string, ProviderCategory>();

    if (moviebox.status === "fulfilled") {
      for (const category of moviebox.value) merged.set(category.id, category);
    }
    if (cineplex.status === "fulfilled") {
      for (const category of cineplex.value) merged.set(category.id, category);
    }

    return [...merged.values()];
  },

  async getCategoryPage(categoryId, page = 1) {
    if (categoryId.startsWith("cineplex-")) {
      return cineplexbdProvider.getCategoryPage(categoryId, page);
    }

    const moviebox = await movieboxWeb.getCategoryPage(categoryId, page);
    if (moviebox) return moviebox;
    return cineplexbdProvider.getCategoryPage(categoryId, page);
  },

  async getDetails(id) {
    if (movieboxWeb.canHandleId(id)) return movieboxWeb.getDetails(id);
    if (cineplexbdProvider.canHandleId(id))
      return cineplexbdProvider.getDetails(id);
    return null;
  },

  async getSeriesNavigation(id, requestedSeason = 1) {
    if (movieboxWeb.canHandleId(id)) {
      return movieboxWeb.getSeriesNavigation(id, requestedSeason);
    }
    if (cineplexbdProvider.canHandleId(id)) {
      return cineplexbdProvider.getSeriesNavigation(id, requestedSeason);
    }
    throw new Error("Unsupported provider series ID");
  },

  async resolveStreams(id, options = {}) {
    if (movieboxWeb.canHandleId(id)) {
      return resolveMovieBoxWithCineplexFallback(id, options);
    }
    if (cineplexbdProvider.canHandleId(id)) {
      return cineplexbdProvider.resolveStreams(id, options);
    }
    return [];
  },
};

export type {
  Entertainment,
  StreamSource,
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  SeriesNavigation,
};
