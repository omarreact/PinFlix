import "server-only";

import * as movieboxWeb from "./moviebox/web";
import type {
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  SeriesNavigation,
} from "./contracts";
import type { Entertainment, StreamSource } from "@/src/types/catalog";

/**
 * PinFlix production catalog/playback provider.
 *
 * CineplexBD has been removed. MovieBox web search, detail resolution,
 * trending catalog and explicitly unlocked playback sources are now the
 * only provider path behind the provider-neutral UI contract.
 */
export const catalogProvider: PinFlixProvider = {
  name: "moviebox",

  canHandleId(id) {
    return movieboxWeb.canHandleId(id);
  },

  search(query, page = 1) {
    return movieboxWeb.search(query, page);
  },

  getLatestPage(kind, page = 1) {
    return movieboxWeb.getLatestPage(kind, page);
  },

  async getCategories(_kind) {
    return [];
  },

  async getCategoryPage(_categoryId, _page = 1) {
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

export type {
  Entertainment,
  StreamSource,
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  SeriesNavigation,
};
