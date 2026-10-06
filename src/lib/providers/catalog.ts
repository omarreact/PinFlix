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
 * PinFlix catalog + playback is bound exclusively to the movibox.net
 * (MovieBox H5 API) implementation in ./moviebox/web.
 */
export const catalogProvider: PinFlixProvider = {
  name: "moviebox",

  canHandleId(id) {
    return movieboxWeb.canHandleId(id);
  },

  async search(query, page = 1) {
    return movieboxWeb.search(query, page);
  },

  async getLatestPage(kind, page = 1) {
    return movieboxWeb.getLatestPage(kind, page);
  },

  async getCategories(kind) {
    return movieboxWeb.getCategories(kind);
  },

  async getCategoryPage(categoryId, page = 1) {
    return movieboxWeb.getCategoryPage(categoryId, page);
  },

  async getDetails(id) {
    return movieboxWeb.getDetails(id);
  },

  async getSeriesNavigation(id, requestedSeason = 1) {
    return movieboxWeb.getSeriesNavigation(id, requestedSeason);
  },

  async resolveStreams(id, options = {}) {
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
