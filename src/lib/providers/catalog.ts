import "server-only";

import { cineplexbdProvider } from "./cineplexbd";
import type {
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  SeriesNavigation,
} from "./contracts";
import type { Entertainment, StreamSource } from "@/src/types/catalog";

/**
 * PinFlix uses CineplexBD as its only catalog and playback provider.
 *
 * MovieBox and all other external playback/catalog adapters are intentionally
 * excluded from the active production pipeline.
 */
export const catalogProvider: PinFlixProvider = cineplexbdProvider;

export type {
  Entertainment,
  StreamSource,
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  SeriesNavigation,
};
