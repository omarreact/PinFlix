import type { Entertainment } from "@/src/types/catalog";

export type CineplexCategoryKind =
  | "movie"
  | "series"
  | "animation"
  | "show"
  | "sports"
  | "collection";

export type CineplexCategoryGroup =
  | "movies"
  | "hindi-dubbed"
  | "animations-shows"
  | "regional-special"
  | "web-series-sports"
  | "top-watch"
  | string;

export type CineplexCategory = {
  id: string;
  provider: "cineplexbd";
  label: string;
  upstreamLabel: string;
  group: CineplexCategoryGroup;
  kind: CineplexCategoryKind;
  endpoint: string;
  categoryValue?: string;
  href: string;
  supportsPagination: boolean;
  supportedInPinflix: boolean;
};

export type CineplexNavigationItem = {
  label: string;
  href: string;
  endpoint: string;
  query: Record<string, string>;
  hasSubmenu: boolean;
  contentType: "navigation" | "movie" | "series" | "software" | "unknown";
  supportedInPinflix: boolean;
};

export type CineplexTaxonomy = {
  navigation: CineplexNavigationItem[];
  categories: CineplexCategory[];
  source: "live" | "fallback";
};

export type CineplexCatalogPage = {
  category: CineplexCategory;
  items: Entertainment[];
  page: number;
  hasNextPage: boolean;
};
