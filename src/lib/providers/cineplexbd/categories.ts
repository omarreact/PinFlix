import * as cheerio from "cheerio";
import { fetchHtml } from "./api";
import type {
  CineplexCategory,
  CineplexCategoryGroup,
  CineplexCategoryKind,
  CineplexNavigationItem,
  CineplexTaxonomy,
} from "./types";

const BASE_URL = "http://cineplexbd.net";
const TOP_LEVEL_LABELS = new Set(["HOME", "MOVIE", "TV SERIES", "TOP WATCH", "SOFTWARE"]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createCategory(
  endpoint: "category.php" | "tcategory.php",
  categoryValue: string,
  label: string,
  group: CineplexCategoryGroup,
  kind: CineplexCategoryKind,
): CineplexCategory {
  const params = new URLSearchParams({ category: categoryValue, page: "1" });
  return {
    id: `cineplex-${group}-${slugify(categoryValue)}`,
    provider: "cineplexbd",
    label,
    upstreamLabel: categoryValue.split("/").at(-1) || label,
    group,
    kind,
    endpoint,
    categoryValue,
    href: `/${endpoint}?${params.toString()}`,
    supportsPagination: true,
    supportedInPinflix: true,
  };
}

const movieCategories = [
  "3D Movies",
  "4K Movies",
  "Animation",
  "Anime",
  "Bangla",
  "Bangla Dubbed",
  "Bangla Movies",
  "Chinese",
  "Documentaries",
  "Dual Audio",
  "English",
  "Exclusive Full HD",
  "Foreign",
  "Hindi",
  "Indonesian",
  "Japanese",
  "Kids Cartoon",
  "Korean",
  "Pakistani",
  "Punjabi",
  "Romance",
] as const;

const hindiDubbedCategories = [
  ["Hindi Dubbed/Chinees Movies", "Chinese Movies"],
  ["Hindi Dubbed/English Movies", "English Movies"],
  ["Hindi Dubbed/Indonesian Movies", "Indonesian Movies"],
  ["Hindi Dubbed/Japanese Movies", "Japanese Movies"],
  ["Hindi Dubbed/Korean Movies", "Korean Movies"],
  ["Hindi Dubbed/Tamil Movies", "Tamil Movies"],
] as const;

const regionalSeries = [
  "Bangla Series",
  "Bangla Drama",
  "Indian Bangla",
  "Indian Bangla Drama",
  "Islamic Series",
  "Bangla Dubbed",
  "Hindi Dubbed",
  "Bangla",
] as const;

const webSeries = [
  "Web Series",
  "Hindi Series",
  "Pakistani Series",
  "English Series",
  "Korean Series",
  "Japanese Series",
  "Others Series",
] as const;

const animationAndShows = [
  ["Animation Series", "animation"],
  ["Bangla Animation", "animation"],
  ["Hindi Animation", "animation"],
  ["English Animation", "animation"],
  ["Others Animation", "animation"],
  ["Award Shows", "show"],
  ["Bangla Shows", "show"],
  ["English Shows", "show"],
  ["Hindi Shows", "show"],
  ["Others Shows", "show"],
  ["Entertainment", "show"],
  ["Documentary", "show"],
] as const;

const sports = ["WWE", "AEW Wrestling", "WWE Wrestling"] as const;

export const fallbackCineplexCategories: CineplexCategory[] = [
  ...movieCategories.map((value) => createCategory("category.php", value, value, "movies", "movie")),
  ...hindiDubbedCategories.map(([value, label]) =>
    createCategory("category.php", value, label, "hindi-dubbed", "movie"),
  ),
  ...regionalSeries.map((value) =>
    createCategory("tcategory.php", value, value, "regional-special", "series"),
  ),
  ...webSeries.map((value) =>
    createCategory("tcategory.php", value, value, "web-series-sports", "series"),
  ),
  ...animationAndShows.map(([value, kind]) =>
    createCategory("tcategory.php", value, value, "animations-shows", kind),
  ),
  ...sports.map((value) =>
    createCategory("tcategory.php", value, value, "web-series-sports", "sports"),
  ),
];

function fallbackMatch(endpoint: string, categoryValue: string) {
  return fallbackCineplexCategories.find(
    (item) => item.endpoint === endpoint && item.categoryValue === categoryValue,
  );
}

function inferGroup(endpoint: string, categoryValue: string, label: string): CineplexCategoryGroup {
  if (endpoint === "category.php") {
    return categoryValue.startsWith("Hindi Dubbed/") ? "hindi-dubbed" : "movies";
  }

  const value = `${categoryValue} ${label}`.toLowerCase();
  if (/wwe|wrestling|web series|hindi series|pakistani series|english series|chinese series|korean series|japanese series|others.*series/.test(value)) {
    return "web-series-sports";
  }
  if (/animation|award show|bangla show|english show|hindi show|others show/.test(value)) {
    return "animations-shows";
  }
  return "regional-special";
}

function inferKind(endpoint: string, categoryValue: string, label: string): CineplexCategoryKind {
  if (endpoint === "category.php") return "movie";
  const value = `${categoryValue} ${label}`.toLowerCase();
  if (/wwe|wrestling|aew/.test(value)) return "sports";
  if (/animation/.test(value)) return "animation";
  if (/show|entertainment|documentary/.test(value) && !/series/.test(value)) return "show";
  return "series";
}

function normalizeLiveCategory(anchorHref: string, label: string): CineplexCategory | null {
  try {
    const url = new URL(anchorHref, BASE_URL);
    const endpoint = url.pathname.split("/").filter(Boolean).at(-1) || "";
    if (endpoint !== "category.php" && endpoint !== "tcategory.php") return null;

    const categoryValue = url.searchParams.get("category")?.trim();
    if (!categoryValue) return null;

    const known = fallbackMatch(endpoint, categoryValue);
    const group = known?.group ?? inferGroup(endpoint, categoryValue, label);
    const kind = known?.kind ?? inferKind(endpoint, categoryValue, label);
    const friendlyLabel = known?.label ?? (label || categoryValue.split("/").at(-1) || categoryValue);

    return {
      id: `cineplex-${group}-${slugify(categoryValue)}`,
      provider: "cineplexbd",
      label: friendlyLabel,
      upstreamLabel: label || categoryValue.split("/").at(-1) || categoryValue,
      group,
      kind,
      endpoint,
      categoryValue,
      href: `${url.pathname}${url.search}`,
      supportsPagination: true,
      supportedInPinflix: true,
    };
  } catch {
    return null;
  }
}

export function parseCineplexTaxonomy(html: string): CineplexTaxonomy {
  const $ = cheerio.load(html);
  const navigation: CineplexNavigationItem[] = [];
  const categoryMap = new Map<string, CineplexCategory>();

  $("a[href]").each((_, element) => {
    const anchor = $(element);
    const label = anchor.text().replace(/\s+/g, " ").trim();
    const href = anchor.attr("href")?.trim();
    if (!href || !label) return;

    const category = normalizeLiveCategory(href, label);
    if (category) {
      const key = `${category.endpoint}|${category.categoryValue}`;
      if (!categoryMap.has(key)) categoryMap.set(key, category);
    }

    if (!TOP_LEVEL_LABELS.has(label.toUpperCase())) return;
    try {
      const url = new URL(href, BASE_URL);
      const endpoint = url.pathname.split("/").filter(Boolean).at(-1) || "/";
      const upper = label.toUpperCase();
      navigation.push({
        label,
        href: `${url.pathname}${url.search}`,
        endpoint,
        query: Object.fromEntries(url.searchParams.entries()),
        hasSubmenu: upper === "MOVIE" || upper === "TV SERIES",
        contentType:
          upper === "MOVIE"
            ? "movie"
            : upper === "TV SERIES"
              ? "series"
              : upper === "SOFTWARE"
                ? "software"
                : "navigation",
        supportedInPinflix: upper !== "SOFTWARE",
      });
    } catch {
      // Ignore malformed upstream navigation links.
    }
  });

  return {
    navigation: navigation.filter(
      (item, index, list) =>
        list.findIndex((candidate) => candidate.label.toUpperCase() === item.label.toUpperCase()) === index,
    ),
    categories: [...categoryMap.values()],
    source: "live",
  };
}

export async function getCineplexTaxonomy(): Promise<CineplexTaxonomy> {
  try {
    const html = await fetchHtml("/", 21_600);
    const live = parseCineplexTaxonomy(html);
    const movieCount = live.categories.filter((item) => item.endpoint === "category.php").length;
    const tvCount = live.categories.filter((item) => item.endpoint === "tcategory.php").length;
    if (live.categories.length >= 10 && movieCount > 0 && tvCount > 0) return live;
  } catch (error) {
    console.warn("CineplexBD live taxonomy unavailable; using verified fallback.", error);
  }

  return {
    navigation: [],
    categories: fallbackCineplexCategories,
    source: "fallback",
  };
}

export async function getCineplexCategories(kind?: "movie" | "tv") {
  const taxonomy = await getCineplexTaxonomy();
  if (!kind) return taxonomy.categories;

  if (kind === "movie") {
    return taxonomy.categories.filter((category) => category.endpoint === "category.php");
  }

  return taxonomy.categories.filter((category) => category.endpoint === "tcategory.php");
}

export async function getCineplexCategory(id: string) {
  const taxonomy = await getCineplexTaxonomy();
  return taxonomy.categories.find((category) => category.id === id) ?? null;
}
