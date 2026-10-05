import "server-only";

import * as movieboxWeb from "./moviebox/web";
import {
  getPublicCategories,
  getPublicCategoryPage,
} from "./moviebox/public-web";
import { cineplexbdProvider } from "./cineplexbd";
import type {
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  SeriesNavigation,
} from "./contracts";
import type { Entertainment, StreamSource } from "@/src/types/catalog";

export const catalogProvider: PinFlixProvider = {
  name: "multiplex",

  canHandleId(id) {
    return movieboxWeb.canHandleId(id) || cineplexbdProvider.canHandleId(id);
  },

  async search(query, page = 1) {
    const [mb, cb] = await Promise.all([
      movieboxWeb.search(query, page).catch(() => []),
      cineplexbdProvider.search(query, page).catch(() => []),
    ]);
    return [...cb, ...mb];
  },

  async getLatestPage(kind, page = 1) {
    // Prefer cineplexbd since moviebox search/latest might be broken due to token
    return cineplexbdProvider.getLatestPage(kind, page).catch(() => movieboxWeb.getLatestPage(kind, page));
  },

  async getCategories(kind) {
    return cineplexbdProvider.getCategories(kind);
  },

  async getCategoryPage(categoryId, page = 1) {
    return cineplexbdProvider.getCategoryPage(categoryId, page);
  },

  async getDetails(id) {
    if (cineplexbdProvider.canHandleId(id)) return cineplexbdProvider.getDetails(id);
    return movieboxWeb.getDetails(id);
  },

  async getSeriesNavigation(id, requestedSeason = 1) {
    if (cineplexbdProvider.canHandleId(id)) return cineplexbdProvider.getSeriesNavigation(id, requestedSeason);
    return movieboxWeb.getSeriesNavigation(id, requestedSeason);
  },

  async resolveStreams(id, options = {}) {
    if (cineplexbdProvider.canHandleId(id)) return cineplexbdProvider.resolveStreams(id, options);
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
