import "server-only";

import * as movieboxWeb from "./moviebox/web";
import {
  getPublicCategories,
  getPublicCategoryPage,
} from "./moviebox/public-web";
import type {
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  SeriesNavigation,
} from "./contracts";
import type { Entertainment, StreamSource } from "@/src/types/catalog";

/**
 * MovieBox is the single source behind the PinFlix catalog contract.
 *
 * Structured MovieBox web endpoints are preferred for search/trending/details
 * and public first-party MovieBox pages supply editorial collections and a
 * resilient catalog fallback. Playback remains restricted to direct sources
 * explicitly returned as unlocked by MovieBox.
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

  getCategories(kind) {
    return getPublicCategories(kind);
  },

  getCategoryPage(categoryId, page = 1) {
    return getPublicCategoryPage(categoryId, page);
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
