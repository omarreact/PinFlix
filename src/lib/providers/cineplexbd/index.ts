import { search as universalSearch } from "@/src/lib/cineplex/search";
import { series as discoverSeries } from "@/src/lib/cineplex/series";
import { movie as discoverMovie } from "@/src/lib/cineplex/movies";
import { fetchCineplexOrigin, isAllowedCineplexUrl } from "@/src/lib/cineplex-origin";
import type {
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  ProviderKind,
  SeriesNavigation,
} from "../contracts";
import type { Entertainment, StreamSource } from "@/src/types/catalog";
import { fetchHtml, CINEPLEX_BASE_URL } from "./api";
import {
  getCineplexCategories,
  getCineplexCategory,
  getCineplexTaxonomy,
} from "./categories";
import {
  parseCatalog,
  parseHasNextPage,
  parsePlayerUrl,
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

async function getLatestPage(kind: ProviderKind, page = 1): Promise<ProviderCatalogPage> {
 const result = await universalSearch({type:kind === 'show' ? 'series':'movie',page});
 return {items:result.items,page:result.page,hasNextPage:result.hasNextPage};
}
async function getDetails(id: string): Promise<Entertainment | null> {
 const {rawId,kind} = parseProviderId(id);
 if (!/^\d{1,12}$/.test(rawId)) return null;
 return kind === 'show' ? (await discoverSeries(rawId)).item : (await discoverMovie(rawId)).item;
}
async function getSeriesNavigation(id: string, requestedSeason = 1): Promise<SeriesNavigation> {
 const {rawId,kind} = parseProviderId(id);
 if (kind !== 'show') return {seasons:[],season:requestedSeason,episodes:0};
 const result = await discoverSeries(rawId, requestedSeason);
 return {seasons:result.seasons,season:result.season,episodes:result.episodes.length,episodeItems:result.episodes};
}

async function resolveVideoUrl(
  id: string,
  options: SeriesPlaybackOptions = {},
): Promise<{ url: string; cookies: string } | null> {
  const { rawId, kind } = parseProviderId(id);
  const encodedId = encodeURIComponent(rawId);
  const season = safePositiveInteger(options.season, 1);
  const episode = safePositiveInteger(options.episode, 1);

  async function tryFetchWithCookies(paths: string[]) {
    for (const path of paths) {
      try {
        const response = await fetchCineplexOrigin(`${CINEPLEX_BASE_URL}${path}`, { cache: "no-store", signal: AbortSignal.timeout(7000) });
        if (!response.ok) continue;
        const html = await response.text();
        const setCookies = response.headers.get("set-cookie") || "";
        let cookies = "";
        const hlse = setCookies.match(/hlse=([^;]+)/)?.[0];
        const hlsk = setCookies.match(/hlsk=([^;]+)/)?.[0];
        if (hlse && hlsk) cookies = `${hlse}; ${hlsk}`;
        return { html, cookies };
      } catch {
        continue;
      }
    }
    return null;
  }

  if (kind === "show") {
    const page = await tryFetchWithCookies([
      `/watch.php?id=${encodedId}&season=${season}&ep=${episode}&autoplay=1`,
      `/watch.php?series_id=${encodedId}&season=${season}&ep=${episode}&autoplay=1`,
      `/watch.php?id=${encodedId}&season=${season}`,
      `/watch.php?series_id=${encodedId}&season=${season}`,
    ]);
    if (page) {
      const url = parsePlayerUrl(page.html);
      return url ? { url, cookies: page.cookies } : null;
    }
    return null;
  }

  try {
    const viewPage = await tryFetchWithCookies([`/view.php?id=${encodedId}`]);
    const viewHtml = viewPage?.html || "";
    const playerMatch = viewHtml.match(/player\.php\?id=(\d+)/i);
    if (playerMatch?.[1]) {
      const movieId = encodeURIComponent(playerMatch[1]);

      try {
        const downloadRes = await fetchCineplexOrigin(`${CINEPLEX_BASE_URL}/download.php?id=${movieId}`, {
          signal: AbortSignal.timeout(7000),
          redirect: "manual",
          headers: { "User-Agent": "Mozilla/5.0" },
        });

        if (downloadRes.status === 301 || downloadRes.status === 302) {
          const location = downloadRes.headers.get("location");
          if (location) {
            return { url: location, cookies: viewPage?.cookies || "" };
          }
        }
      } catch (err) {
        console.error("CineplexBD download redirect fetch error:", err);
      }

      const playerPage = await tryFetchWithCookies([`/player.php?id=${movieId}`]);
      if (playerPage) {
        const source = parsePlayerUrl(playerPage.html);
        if (source) return { url: source, cookies: playerPage.cookies };
      }
    }
  } catch {
  }

  try {
    const playerPage = await tryFetchWithCookies([`/player.php?id=${encodedId}`]);
    if (playerPage) {
      const url = parsePlayerUrl(playerPage.html);
      return url ? { url, cookies: playerPage.cookies } : null;
    }
  } catch {
  }
  return null;
}

async function resolveStreams(
  id: string,
  options: SeriesPlaybackOptions = {},
): Promise<StreamSource[]> {
  try {
    if (process.env.CINEPLEX_PLAYBACK_AUTHORIZED !== 'true') return [];
    if (id.startsWith('cb-series-')) {
      const navigation = await discoverSeries(parseProviderId(id).rawId,options.season ?? 1);
      if (!navigation.episodes.some(item => item.number === (options.episode ?? 1))) return [];
    }
    const result = await resolveVideoUrl(id, options);
    if (!result) return [];

    let { url: videoUrl } = result;


    if (videoUrl.startsWith("/")) {
      videoUrl = `${CINEPLEX_BASE_URL}${videoUrl}`;
    }

    if (!isAllowedCineplexUrl(videoUrl)) return [];
    const isHls = /\.m3u8(?:$|[?#])/i.test(videoUrl);

    const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(videoUrl)}`;

    return [
      {
        url: proxyUrl,
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
    const html = await fetchHtml(`/${category.endpoint}?${params.toString()}`, 300);
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

  async search(query: string, page = 1) { return (await universalSearch({q:query,page})).items; },

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
