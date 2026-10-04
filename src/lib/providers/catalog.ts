import "server-only";

import * as movieboxWeb from "./moviebox/web";
import type {
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  ProviderHomeFeed,
  ProviderHomeSection,
  SeriesNavigation,
} from "./contracts";
import type { Entertainment, StreamSource } from "@/src/types/catalog";

/**
 * MovieBox is the single PinFlix catalog, discovery, detail and playback
 * provider. The UI consumes this provider-neutral facade so upstream response
 * shapes remain isolated from application components.
 */
export const catalogProvider: PinFlixProvider = {
  name: "moviebox",

  canHandleId(id) {
    return movieboxWeb.canHandleId(id);
  },

  search(query, page = 1) {
    return movieboxWeb.search(query, page);
  },

  getHomeFeed() {
    return movieboxWeb.getHomeFeed();
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

  getRecommendations(id, page = 1) {
    return movieboxWeb.getRecommendations(id, page);
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
  ProviderHomeFeed,
  ProviderHomeSection,
  SeriesNavigation,
};
