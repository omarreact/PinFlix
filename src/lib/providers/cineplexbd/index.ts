import type { Entertainment, StreamSource } from "@/src/types/catalog";
import { fetchHtml, fetchJson, CINEPLEX_BASE_URL } from "./api";
import {
  getCineplexCategories,
  getCineplexCategory,
  getCineplexTaxonomy,
} from "./categories";
import { parseCatalog, parseDetails, parseHasNextPage, parsePlayerUrl } from "./parser";
import type { CineplexCatalogPage } from "./types";

export * from "./types";
export { getCineplexCategories, getCineplexCategory, getCineplexTaxonomy };

type ParsedProviderId = {
  rawId: string;
  kind: "movie" | "show";
};

function parseProviderId(id: string): ParsedProviderId {
  if (id.startsWith("cb-series-")) return { rawId: id.slice("cb-series-".length), kind: "show" };
  if (id.startsWith("cb-movie-")) return { rawId: id.slice("cb-movie-".length), kind: "movie" };
  if (id.startsWith("cb-")) return { rawId: id.slice("cb-".length), kind: "movie" };
  return { rawId: id, kind: "movie" };
}

function transformVodUrl(url: string): string {
  if (!url.includes("vod.cineplexbd.net:8081")) return url;

  const transformed = url
    .replace("http://vod.cineplexbd.net:8081/tv-series/", "/hls/t/")
    .replace("http://vod.cineplexbd.net:8081/movies/", "/hls/m/")
    .replace("http://vod.cineplexbd.net:8081/", "/hls/")
    .replace("/index.m3u8", "/master.m3u8");

  return transformed.startsWith("http")
    ? transformed
    : `${CINEPLEX_BASE_URL}${transformed.startsWith("/") ? transformed : `/${transformed}`}`;
}

async function tryFetchHtml(paths: string[]) {
  for (const path of paths) {
    try {
      return { html: await fetchHtml(path), path };
    } catch {
      // Continue to the next normal public CineplexBD route.
    }
  }
  return null;
}

export async function search(query: string, page = 1): Promise<Entertainment[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  try {
    const html = await fetchHtml(
      `/search.php?q=${encodeURIComponent(normalized)}&page=${Math.max(1, page)}`,
      900,
    );
    return parseCatalog(html);
  } catch (error) {
    console.error("CineplexBD search error:", error);
    return [];
  }
}

export async function getLatest(page = 1): Promise<Entertainment[]> {
  try {
    const html = await fetchHtml(`/search.php?q=&page=${Math.max(1, page)}`, 900);
    return parseCatalog(html);
  } catch (error) {
    console.error("CineplexBD getLatest error:", error);
    return [];
  }
}

export async function getCategoryPage(categoryId: string, page = 1): Promise<CineplexCatalogPage | null> {
  const category = await getCineplexCategory(categoryId);
  if (!category || !category.categoryValue) return null;

  const safePage = Math.max(1, Math.floor(page));
  const params = new URLSearchParams({
    category: category.categoryValue,
    page: String(safePage),
  });

  try {
    const html = await fetchHtml(`/${category.endpoint}?${params.toString()}`, 900);
    const forcedKind = category.endpoint === "category.php" ? "movie" : "show";
    return {
      category,
      items: parseCatalog(html, { forcedKind, category: category.id }),
      page: safePage,
      hasNextPage: parseHasNextPage(html),
    };
  } catch (error) {
    console.error(`CineplexBD category error (${category.id}):`, error);
    return {
      category,
      items: [],
      page: safePage,
      hasNextPage: false,
    };
  }
}

export async function getDetails(id: string): Promise<Entertainment | null> {
  const { rawId, kind } = parseProviderId(id);
  if (!rawId) return null;

  try {
    const details = kind === "show"
      ? await tryFetchHtml([
          `/tview.php?id=${encodeURIComponent(rawId)}`,
          `/watch.php?series_id=${encodeURIComponent(rawId)}`,
          `/watch.php?id=${encodeURIComponent(rawId)}`,
        ])
      : await tryFetchHtml([`/view.php?id=${encodeURIComponent(rawId)}`]);

    if (!details) return null;

    let metaJson: unknown;
    try {
      metaJson = kind === "show"
        ? await fetchJson(
            `/watch.php?series_id=${encodeURIComponent(rawId)}&season=1&meta=1`,
            900,
          )
        : await fetchJson(
            `/watch.php?id=${encodeURIComponent(rawId)}&season=1&meta=1`,
            900,
          );
    } catch {
      metaJson = undefined;
    }

    const partial = parseDetails(details.html, details.path, metaJson);
    const fallbackTitle = kind === "show" ? "CineplexBD Series" : "CineplexBD Movie";

    return {
      id,
      slug: id,
      provider: "cineplexbd",
      providerId: rawId,
      detailUrl: details.path,
      title: partial.title || fallbackTitle,
      kind,
      ...(partial.year !== undefined ? { year: partial.year } : {}),
      ...(partial.rating !== undefined ? { rating: partial.rating } : {}),
      genres: partial.genres ?? [],
      backdrop: partial.backdrop || partial.poster || "",
      poster: partial.poster || "",
      synopsis: partial.synopsis || "",
      ...(partial.episodes !== undefined ? { episodes: partial.episodes } : {}),
    };
  } catch (error) {
    console.error("CineplexBD getDetails error:", error);
    return null;
  }
}

async function resolveVideoUrl(id: string) {
  const { rawId, kind } = parseProviderId(id);
  const paths = kind === "show"
    ? [
        `/watch.php?series_id=${encodeURIComponent(rawId)}`,
        `/watch.php?id=${encodeURIComponent(rawId)}`,
        `/player.php?id=${encodeURIComponent(rawId)}`,
      ]
    : [`/player.php?id=${encodeURIComponent(rawId)}`];

  for (const path of paths) {
    try {
      const html = await fetchHtml(path, 300);
      const url = parsePlayerUrl(html);
      if (url) return url;
    } catch {
      // Try the next public player route.
    }
  }

  return null;
}

export async function resolveStreams(id: string): Promise<StreamSource[]> {
  try {
    let videoUrl = await resolveVideoUrl(id);
    if (!videoUrl) return [];

    if (videoUrl.startsWith("/")) videoUrl = `${CINEPLEX_BASE_URL}${videoUrl}`;

    const isHls = videoUrl.includes(".m3u8");
    if (!videoUrl.includes("vod.cineplexbd.net:8081")) {
      return [{
        url: videoUrl,
        quality: isHls ? "Auto (HLS)" : "Source",
        protocol: isHls ? "hls" : "native",
        priority: 1,
      }];
    }

    const raw: StreamSource = {
      url: videoUrl,
      quality: "Raw VOD",
      protocol: "hls",
      priority: 1,
    };

    const transformedUrl = transformVodUrl(videoUrl);
    if (transformedUrl === videoUrl) return [raw];

    return [
      raw,
      {
        url: transformedUrl,
        quality: "Cineplex HLS fallback",
        protocol: "hls",
        priority: 2,
      },
    ];
  } catch (error) {
    console.error("CineplexBD resolveStreams error:", error);
    return [];
  }
}

export async function getTaxonomySummary() {
  const taxonomy = await getCineplexTaxonomy();
  const movieCategories = taxonomy.categories.filter((item) => item.endpoint === "category.php");
  const tvCategories = taxonomy.categories.filter((item) => item.endpoint === "tcategory.php");
  return {
    source: taxonomy.source,
    navigation: taxonomy.navigation.length,
    movieCategories: movieCategories.length,
    tvCategories: tvCategories.length,
    totalCategories: taxonomy.categories.length,
  };
}
