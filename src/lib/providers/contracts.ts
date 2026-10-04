import type { Entertainment, StreamSource } from "@/src/types/catalog";

export type ProviderKind = "movie" | "show";

export type ProviderCategory = {
  id: string;
  provider: string;
  label: string;
  group: string;
  kind: string;
  supportsPagination: boolean;
  supportedInPinflix: boolean;
};

export type ProviderCatalogPage = {
  items: Entertainment[];
  page: number;
  hasNextPage: boolean;
};

export type ProviderHomeSection = {
  id: string;
  label: string;
  items: Entertainment[];
  kind: ProviderKind | "mixed";
  supportsPagination: boolean;
};

export type ProviderHomeFeed = {
  featured?: Entertainment;
  sections: ProviderHomeSection[];
};

export type SeriesNavigation = {
  seasons: number[];
  season: number;
  episodes: number;
};

export interface PinFlixProvider {
  readonly name: string;
  canHandleId(id: string): boolean;
  search(query: string, page?: number): Promise<Entertainment[]>;
  getHomeFeed(): Promise<ProviderHomeFeed>;
  getLatestPage(kind: ProviderKind, page?: number): Promise<ProviderCatalogPage>;
  getCategories(kind: ProviderKind): Promise<ProviderCategory[]>;
  getCategoryPage(categoryId: string, page?: number): Promise<ProviderCatalogPage | null>;
  getDetails(id: string): Promise<Entertainment | null>;
  getRecommendations(id: string, page?: number): Promise<Entertainment[]>;
  getSeriesNavigation(id: string, requestedSeason?: number): Promise<SeriesNavigation>;
  resolveStreams(
    id: string,
    options?: { season?: number; episode?: number },
  ): Promise<StreamSource[]>;
};
