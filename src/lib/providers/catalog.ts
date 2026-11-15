import * as movieboxWeb from "./moviebox/web";
import type {
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  SeriesNavigation,
} from "./contracts";
import type { Entertainment, StreamSource } from "@/src/types/catalog";

/**
 * Temporary single-provider mode.
 *
 * MovieBox is the only catalogue, search, detail, navigation and playback
 * source. CineplexBD remains in the repository for future re-enablement but is
 * deliberately not called from the active provider graph.
 */
export const catalogProvider: PinFlixProvider = {
  name: "moviebox",

  canHandleId(id) {
    return movieboxWeb.canHandleId(id);
  },

  async search(query, page = 1, kind = "all") {
    return movieboxWeb.search(query, page, kind);
  },

  searchPage(query, page = 1, kind = "all") {
    return movieboxWeb.searchPage(query, page, kind);
  },

  getLatestPage(kind, page = 1) {
    return movieboxWeb.getLatestPage(kind, page);
  },

  getCategories(kind) {
    return movieboxWeb.getCategories(kind);
  },

  getCategoryPage(categoryId, page = 1) {
    return movieboxWeb.getCategoryPage(categoryId, page);
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
