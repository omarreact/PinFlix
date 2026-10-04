import "server-only";

import * as cineplexbd from "./cineplexbd";
import * as movieboxWeb from "./moviebox/web";
import type {
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  SeriesNavigation,
} from "./contracts";
import type { Entertainment, StreamSource } from "@/src/types/catalog";

const CINEPLEX_PRIMARY_WAIT_MS = 1_800;
const CINEPLEX_PLAYBACK_WAIT_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T) {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), ms);
    }),
  ]);
}

const cineplexProvider: PinFlixProvider = {
  name: "cineplexbd",

  canHandleId(id) {
    return id.startsWith("cb-");
  },

  search(query, page = 1) {
    return cineplexbd.search(query, page);
  },

  getLatestPage(kind, page = 1) {
    return cineplexbd.getLatestPage(kind, page);
  },

  async getCategories(kind) {
    const sourceKind = kind === "show" ? "tv" : "movie";
    return cineplexbd.getCineplexCategories(sourceKind) as Promise<ProviderCategory[]>;
  },

  async getCategoryPage(categoryId, page = 1): Promise<ProviderCatalogPage | null> {
    const result = await cineplexbd.getCategoryPage(categoryId, page);
    if (!result) return null;
    return {
      items: result.items,
      page: result.page,
      hasNextPage: result.hasNextPage,
    };
  },

  getDetails(id) {
    return cineplexbd.getDetails(id);
  },

  getSeriesNavigation(id, requestedSeason = 1) {
    return cineplexbd.getSeriesNavigation(id, requestedSeason);
  },

  resolveStreams(id, options = {}) {
    return cineplexbd.resolveStreams(id, options);
  },
};

const movieBoxProvider: PinFlixProvider = {
  name: "moviebox",

  canHandleId(id) {
    return movieboxWeb.canHandleId(id);
  },

  search(query, page = 1) {
    return movieboxWeb.search(query, page);
  },

  async getLatestPage(_kind, page = 1) {
    return { items: [], page, hasNextPage: false };
  },

  async getCategories() {
    return [];
  },

  async getCategoryPage() {
    return null;
  },

  getDetails(id) {
    return movieboxWeb.getDetails(id);
  },

  getSeriesNavigation(id, requestedSeason = 1) {
    return movieboxWeb.getSeriesNavigation(id, requestedSeason);
  },

  resolveStreams(id, options = {}) {
    return movieboxWeb.resolveStreams(id, options);
  },
};

function providerForId(id: string) {
  if (movieBoxProvider.canHandleId(id)) return movieBoxProvider;
  if (cineplexProvider.canHandleId(id)) return cineplexProvider;
  return null;
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findFallbackMatch(
  target: Entertainment,
  candidates: Entertainment[],
) {
  const normalized = normalizeTitle(target.title);

  return candidates.find((candidate) => {
    if (candidate.kind !== target.kind) return false;
    if (normalizeTitle(candidate.title) !== normalized) return false;

    if (target.year && candidate.year) {
      return Math.abs(target.year - candidate.year) <= 1;
    }

    return true;
  });
}

async function searchWithMovieBoxFallback(query: string, page = 1) {
  // Start both lookups together so a degraded Cineplex origin does not add
  // another full timeout before MovieBox can respond.
  const movieBoxPromise = movieBoxProvider
    .search(query, page)
    .catch(() => [] as Entertainment[]);

  const cineplex = await withTimeout(
    cineplexProvider.search(query, page),
    CINEPLEX_PRIMARY_WAIT_MS,
    [] as Entertainment[],
  ).catch(() => [] as Entertainment[]);

  if (cineplex.length) return cineplex;
  return movieBoxPromise;
}

async function resolveWithMovieBoxFallback(
  id: string,
  options: { season?: number; episode?: number } = {},
) {
  if (movieBoxProvider.canHandleId(id)) {
    return movieBoxProvider.resolveStreams(id, options);
  }

  if (!cineplexProvider.canHandleId(id)) return [];

  const primary = await withTimeout(
    cineplexProvider.resolveStreams(id, options),
    CINEPLEX_PLAYBACK_WAIT_MS,
    [] as StreamSource[],
  ).catch(() => [] as StreamSource[]);

  if (primary.length) return primary;

  // If Cineplex identified the title but its media endpoint is degraded,
  // attempt the same title through MovieBox. Only direct, explicitly unlocked
  // MovieBox streams are returned by the MovieBox adapter.
  const details = await withTimeout(
    cineplexProvider.getDetails(id),
    CINEPLEX_PRIMARY_WAIT_MS,
    null,
  ).catch(() => null);

  if (!details) return [];

  const candidates = await movieBoxProvider.search(details.title, 1);
  const fallback = findFallbackMatch(details, candidates);
  if (!fallback) return [];

  return movieBoxProvider.resolveStreams(fallback.id, options);
}

/**
 * Production provider chain:
 *   CineplexBD -> MovieBox fallback
 *
 * Cineplex remains the catalog/navigation source. Search and playback fail
 * over to MovieBox when Cineplex is empty, unreachable or too slow.
 */
export const catalogProvider: PinFlixProvider = {
  name: "pinflix",

  canHandleId(id) {
    return providerForId(id) !== null;
  },

  search(query, page = 1) {
    return searchWithMovieBoxFallback(query, page);
  },

  getLatestPage(kind, page = 1) {
    return cineplexProvider.getLatestPage(kind, page);
  },

  getCategories(kind) {
    return cineplexProvider.getCategories(kind);
  },

  getCategoryPage(categoryId, page = 1) {
    return cineplexProvider.getCategoryPage(categoryId, page);
  },

  getDetails(id) {
    const provider = providerForId(id);
    return provider ? provider.getDetails(id) : Promise.resolve(null);
  },

  getSeriesNavigation(id, requestedSeason = 1) {
    const provider = providerForId(id);
    return provider
      ? provider.getSeriesNavigation(id, requestedSeason)
      : Promise.resolve({
          seasons: [requestedSeason],
          season: requestedSeason,
          episodes: 1,
        });
  },

  resolveStreams(id, options = {}) {
    return resolveWithMovieBoxFallback(id, options);
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
