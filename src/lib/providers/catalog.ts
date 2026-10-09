import "server-only";
import * as movieboxWeb from "./moviebox/web";
import { cineplexbdProvider } from "./cineplexbd";
import { localProvider } from "./local";
import type { PinFlixProvider } from "./contracts";

const movieboxProvider: PinFlixProvider = { name: "moviebox", ...movieboxWeb };
const selected = process.env.CATALOG_PROVIDER === "moviebox" ? movieboxProvider
  : process.env.CATALOG_PROVIDER === "cineplexbd" ? cineplexbdProvider : localProvider;
function forId(id: string) {
  return [localProvider, cineplexbdProvider, movieboxProvider].find((provider) => provider.canHandleId(id));
}
export const catalogProvider: PinFlixProvider = {
  ...selected,
  canHandleId: (id) => Boolean(forId(id)),
  getDetails: (id) => forId(id)?.getDetails(id) ?? Promise.resolve(null),
  getSeriesNavigation: (id, season) => forId(id)?.getSeriesNavigation(id, season) ?? Promise.resolve({ seasons: [1], season: 1, episodes: 1 }),
  resolveStreams: (id, options) => forId(id)?.resolveStreams(id, options) ?? Promise.resolve([]),
};
export type { Entertainment, StreamSource } from "@/src/types/catalog";
export type { PinFlixProvider, ProviderCatalogPage, ProviderCategory, SeriesNavigation } from "./contracts";
