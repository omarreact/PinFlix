import type {
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  ProviderKind,
  SeriesNavigation,
} from "../contracts";
import type { Entertainment, StreamSource } from "@/src/types/catalog";
import { fetchHtml, fetchJson, CINEPLEX_BASE_URL } from "./api";
import {
  getCineplexCategories,
  getCineplexCategory,
  getCineplexTaxonomy,
} from "./categories";
import {
  parseCatalog,
  parseDetails,
  parseEpisodeCount,
  parseHasNextPage,
  parsePlayerUrl,
  parseSeasonNumbers,
} from "./parser";

type ParsedProviderId = {
  rawId: string;
  kind: "movie" | "show";
};

type SeriesPlaybackOptions = {
  season?: number;
  episode?: number;
};

function parseProviderId(id: string): ParsedProviderId {
  if (id.startsWith("cb-series-")) {
    return { rawId: id.slice("cb-series-".length), kind: "show" };
  }
  if (id.startsWith("cb-movie-")) {
    return { rawId: id.slice("cb-movie-".length), kind: "movie" };
  }
  if (id.startsWith("cb-")) {
    return { rawId: id.slice("cb-".length), kind: "movie" };
  }
  return { rawId: id, kind: "movie" };
}

function safePositiveInteger(value: number | undefined, fallback: number) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

async function tryFetchHtml(paths: string[]) {
  for (const path of paths) {
    try {
      return { html: await fetchHtml(path, 0), path };
    } catch {
      // Continue through the verified public CineplexBD route fallbacks.
    }
  }
  return null;
}

async function tryFetchJson(paths: string[]) {
  for (const path of paths) {
    try {
      return await fetchJson(path, 0);
    } catch {
      // Continue to the next public metadata route.
    }
  }
  return undefined;
}

async function getLatestPage(
  kind: ProviderKind,
  page = 1,
): Promise<ProviderCatalogPage> {
  const safePage = Math.max(1, Math.floor(page));

  if (kind === "movie") {
    try {
      const html = await fetchHtml(`/search.php?q=&page=${safePage}`, 0);
      const all = parseCatalog(html);
      const items = all.filter((item) => item.kind === "movie");
      return {
        items: items.length ? items : all,
        page: safePage,
        hasNextPage: parseHasNextPage(html),
      };
    } catch (error) {
      console.error("CineplexBD movie catalog error:", error);
      return { items: [], page: safePage, hasNextPage: false };
    }
  }

  const [webSeries, recent] = await Promise.allSettled([
    fetchHtml(
      `/tcategory.php?category=${encodeURIComponent("Web Series")}&page=${safePage}`,
      0,
    ),
    fetchHtml(`/search.php?q=&page=${safePage}`, 0),
  ]);

  const seen = new Set<string>();
  const items = [
    ...(webSeries.status === "fulfilled"
      ? parseCatalog(webSeries.value, { forcedKind: "show" })
      : []),
    ...(recent.status === "fulfilled"
      ? parseCatalog(recent.value).filter((item) => item.kind === "show")
      : []),
  ].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return {
    items,
    page: safePage,
    hasNextPage:
      (webSeries.status === "fulfilled" && parseHasNextPage(webSeries.value)) ||
      (recent.status === "fulfilled" && parseHasNextPage(recent.value)),
  };
}

async function getDetails(id: string): Promise<Entertainment | null> {
  const { rawId, kind } = parseProviderId(id);
  if (!rawId) return null;

  try {
    const encodedId = encodeURIComponent(rawId);
    const details =
      kind === "show"
        ? await tryFetchHtml([
            `/watch.php?id=${encodedId}&season=1`,
            `/watch.php?series_id=${encodedId}&season=1`,
            `/tview.php?id=${encodedId}`,
          ])
        : await tryFetchHtml([`/view.php?id=${encodedId}`]);

    if (!details) return null;

    const metaJson = await tryFetchJson([
      `/watch.php?id=${encodedId}&season=1&meta=1`,
      `/watch.php?series_id=${encodedId}&season=1&meta=1`,
    ]);

    const partial = parseDetails(details.html, details.path, metaJson);

    return {
      id,
      slug: id,
      provider: "cineplexbd",
      providerId: rawId,
      detailUrl: details.path,
      title:
        partial.title ||
        (kind === "show" ? "CineplexBD Series" : "CineplexBD Movie"),
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
    console.error("CineplexBD details error:", error);
    return null;
  }
}

async function getSeriesNavigation(
  id: string,
  requestedSeason = 1,
): Promise<SeriesNavigation> {
  const { rawId, kind } = parseProviderId(id);
  const fallbackSeason = safePositiveInteger(requestedSeason, 1);

  if (!rawId || kind !== "show") {
    return { seasons: [fallbackSeason], season: fallbackSeason, episodes: 1 };
  }

  const encodedId = encodeURIComponent(rawId);
  const page = await tryFetchHtml([
    `/watch.php?id=${encodedId}&season=${fallbackSeason}`,
    `/watch.php?series_id=${encodedId}&season=${fallbackSeason}`,
    `/tview.php?id=${encodedId}`,
  ]);

  const seasons = page ? parseSeasonNumbers(page.html) : [];
  const season = seasons.includes(fallbackSeason)
    ? fallbackSeason
    : seasons[0] ?? fallbackSeason;

  const metaJson = await tryFetchJson([
    `/watch.php?id=${encodedId}&season=${season}&meta=1`,
    `/watch.php?series_id=${encodedId}&season=${season}&meta=1`,
  ]);

  return {
    seasons: seasons.length ? seasons : [season],
    season,
    episodes: parseEpisodeCount(metaJson, page?.html ?? ""),
  };
}

async function resolveVideoUrl(
  id: string,
  options: SeriesPlaybackOptions = {},
): Promise<string | null> {
  const { rawId, kind } = parseProviderId(id);
  const encodedId = encodeURIComponent(rawId);
  const season = safePositiveInteger(options.season, 1);
  const episode = safePositiveInteger(options.episode, 1);

  if (kind === "show") {
    const page = await tryFetchHtml([
      `/watch.php?id=${encodedId}&season=${season}&ep=${episode}&autoplay=1`,
      `/watch.php?series_id=${encodedId}&season=${season}&ep=${episode}&autoplay=1`,
      `/watch.php?id=${encodedId}&season=${season}`,
      `/watch.php?series_id=${encodedId}&season=${season}`,
    ]);
    return page ? parsePlayerUrl(page.html) : null;
  }

  // Movies commonly expose the actual player ID from view.php. Resolve it
  // first, then retain player.php?id=<catalog id> as a compatibility fallback.
  try {
    const viewHtml = await fetchHtml(`/view.php?id=${encodedId}`, 0);
    const playerMatch = viewHtml.match(/player\.php\?id=(\d+)/i);
    if (playerMatch?.[1]) {
      const playerHtml = await fetchHtml(
        `/player.php?id=${encodeURIComponent(playerMatch[1])}`,
        0,
      );
      const source = parsePlayerUrl(playerHtml);
      if (source) return source;
    }
  } catch {
    // Fall through to the direct player route.
  }

  try {
    const playerHtml = await fetchHtml(`/player.php?id=${encodedId}`, 0);
    return parsePlayerUrl(playerHtml);
  } catch {
    return null;
  }
}

async function resolveStreams(
  id: string,
  options: SeriesPlaybackOptions = {},
): Promise<StreamSource[]> {
  try {
    let videoUrl = await resolveVideoUrl(id, options);
    if (!videoUrl) return [];

    if (videoUrl.startsWith("/")) {
      videoUrl = `${CINEPLEX_BASE_URL}${videoUrl}`;
    }

    const isHls = /\.m3u8(?:$|[?#])/i.test(videoUrl);

    return [
      {
        url: `/api/proxy-video?url=${encodeURIComponent(videoUrl)}`,
        quality: isHls ? "Cineplex HLS" : "Cineplex source",
        protocol: isHls ? "hls" : "native",
        priority: 1,
      },
    ];
  } catch (error) {
    console.error("CineplexBD stream resolution error:", error);
    return [];
  }
}

async function getCategories(kind: ProviderKind): Promise<ProviderCategory[]> {
  const categories = await getCineplexCategories(kind === "movie" ? "movie" : "tv");
  return categories.map((category) => ({
    id: category.id,
    provider: "cineplexbd",
    label: category.label,
    group: category.group,
    kind: category.kind,
    supportsPagination: category.supportsPagination,
    supportedInPinflix: category.supportedInPinflix,
  }));
}

async function getCategoryPage(
  categoryId: string,
  page = 1,
): Promise<ProviderCatalogPage | null> {
  const category = await getCineplexCategory(categoryId);
  if (!category?.categoryValue) return null;

  const safePage = Math.max(1, Math.floor(page));
  const params = new URLSearchParams({
    category: category.categoryValue,
    page: String(safePage),
  });

  try {
    const html = await fetchHtml(`/${category.endpoint}?${params.toString()}`, 0);
    const forcedKind = category.endpoint === "category.php" ? "movie" : "show";
    return {
      items: parseCatalog(html, {
        forcedKind,
        category: category.id,
      }),
      page: safePage,
      hasNextPage: parseHasNextPage(html),
    };
  } catch (error) {
    console.error(`CineplexBD category error (${category.id}):`, error);
    return { items: [], page: safePage, hasNextPage: false };
  }
}

export const cineplexbdProvider: PinFlixProvider = {
  name: "cineplexbd",

  canHandleId(id: string) {
    return /^cb-(?:movie-|series-)?\d+$/.test(id);
  },

  async search(query: string, page = 1) {
    const normalized = query.trim();
    if (!normalized) return [];

    try {
      const html = await fetchHtml(
        `/search.php?q=${encodeURIComponent(normalized)}&page=${Math.max(1, page)}`,
        0,
      );
      return parseCatalog(html);
    } catch (error) {
      console.error("CineplexBD search error:", error);
      return [];
    }
  },

  getLatestPage,
  getCategories,
  getCategoryPage,
  getDetails,
  getSeriesNavigation,
  resolveStreams,
};

export async function getCineplexStatusSummary() {
  const taxonomy = await getCineplexTaxonomy();
  return {
    provider: "cineplexbd",
    taxonomySource: taxonomy.source,
    categories: taxonomy.categories.length,
    navigation: taxonomy.navigation.length,
  };
}
