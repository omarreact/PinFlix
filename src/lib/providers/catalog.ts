import "server-only";

import * as cineplexbd from "./cineplexbd";
import type {
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  SeriesNavigation,
} from "./contracts";
import type { Entertainment, StreamSource } from "@/src/types/catalog";

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

/**
 * Current production adapter. UI/routes consume this provider-neutral
 * contract so MovieBox can be activated later without another UI rewrite.
 */
export const catalogProvider = cineplexProvider;

export type {
  Entertainment,
  StreamSource,
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  SeriesNavigation,
};
