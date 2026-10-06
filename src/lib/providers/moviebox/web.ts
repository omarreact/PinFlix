import "server-only";

import type { Entertainment, StreamSource } from "@/src/types/catalog";
import type { SeriesNavigation } from "../contracts";

const API_BASE = "https://h5-api.aoneroom.com";
const SITE_BASE = "https://movibox.net";
const PLAYBACK_BASE = "https://movibox.net";

const REQUEST_TIMEOUT_MS = 5_000;

type H5ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export type MovieBoxHomeSection = {
  id: string;
  label: string;
  items: Entertainment[];
};

// Utilities
function parseProviderId(id: string) {
  const match = id.match(/^mb-(\d+)~(.+)$/);
  if (!match) return null;

  return {
    subjectId: match[1],
    detailPath: match[2],
  };
}

function providerId(subjectId: string | number, detailPath: string) {
  return `mb-${String(subjectId)}~${detailPath}`;
}

async function fetchJson<T>(
  url: URL | string,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    const headers = new Headers(init.headers);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (!headers.has("User-Agent")) {
      headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    }
    
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// 1. canHandleId
export function canHandleId(id: string): boolean {
  return parseProviderId(id) !== null;
}

// 2. search - Defer to other providers
export async function search(query: string, page = 1): Promise<Entertainment[]> {
  return [];
}

// 3. getLatestPage & getCategories & getCategoryPage
export async function getLatestPage(kind: "movie" | "show", page = 1) {
  const channelId = kind === "movie" ? 1 : 2;
  const url = new URL("/wefeed-h5api-bff/subject/filter", API_BASE);
  
  try {
    const res = await fetchJson<H5ApiResponse<any>>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, perPage: 28, channelId }),
    });
    
    if (res.code !== 0 || !res.data?.items) {
      return { items: [], page, hasNextPage: false };
    }
    
    const items: Entertainment[] = res.data.items.map((item: any) => ({
      id: providerId(item.subjectId, item.detailPath),
      slug: providerId(item.subjectId, item.detailPath),
      kind,
      provider: "moviebox",
      providerId: String(item.subjectId),
      title: item.title,
      synopsis: item.description || "",
      year: item.releaseDate ? parseInt(item.releaseDate.split("-")[0]) : undefined,
      poster: item.cover?.url || "",
      backdrop: Array.isArray(item.stills) ? item.stills[0]?.url : item.stills?.url || "",
      genres: item.genre ? item.genre.split(",").map((g: string) => g.trim()) : [],
      rating: item.imdbRatingValue ? parseFloat(item.imdbRatingValue) : undefined,
      detailUrl: new URL(`/detail/${item.detailPath}`, SITE_BASE).toString(),
    }));
    
    return {
      items,
      page: parseInt(res.data.pager?.page || String(page)),
      hasNextPage: res.data.pager?.hasMore ?? false,
    };
  } catch (error) {
    console.error("MovieBox getLatestPage error:", error);
    return { items: [], page, hasNextPage: false };
  }
}

export async function getCategories(kind: "movie" | "show") {
  return [];
}

export async function getCategoryPage(categoryId: string, page = 1) {
  return null;
}

// 4. getDetails
export async function getDetails(id: string): Promise<Entertainment | null> {
  const parsed = parseProviderId(id);
  if (!parsed) return null;
  
  const url = new URL("/wefeed-h5api-bff/detail", API_BASE);
  url.searchParams.set("detailPath", parsed.detailPath);
  
  try {
    const res = await fetchJson<H5ApiResponse<any>>(url);
    if (res.code !== 0 || !res.data?.subject) return null;
    
    const subj = res.data.subject;
    const kind = subj.subjectType === 2 ? "show" : "movie";
    
    const cast = res.data.stars?.map((star: any) => ({
      name: star.name,
      role: star.character,
    }));
    
    return {
      id,
      slug: id,
      kind,
      provider: "moviebox",
      providerId: String(subj.subjectId),
      title: subj.title,
      synopsis: subj.description || "",
      year: subj.releaseDate ? parseInt(subj.releaseDate.split("-")[0]) : undefined,
      poster: subj.cover?.url || "",
      backdrop: Array.isArray(subj.stills) ? subj.stills[0]?.url : (subj.stills?.url || ""),
      genres: subj.genre ? subj.genre.split(",").map((g: string) => g.trim()) : [],
      rating: subj.imdbRatingValue ? parseFloat(subj.imdbRatingValue) : undefined,
      cast,
      detailUrl: new URL(`/detail/${parsed.detailPath}`, SITE_BASE).toString(),
    };
  } catch (error) {
    console.error("MovieBox getDetails error:", error);
    return null;
  }
}

// 5. getSeriesNavigation
export async function getSeriesNavigation(
  id: string,
  requestedSeason = 1,
): Promise<SeriesNavigation> {
  const fallbackSeason =
    Number.isInteger(requestedSeason) && requestedSeason > 0
      ? requestedSeason
      : 1;

  const parsed = parseProviderId(id);
  if (!parsed) {
    return { seasons: [fallbackSeason], season: fallbackSeason, episodes: 1 };
  }
  
  const url = new URL("/wefeed-h5api-bff/detail", API_BASE);
  url.searchParams.set("detailPath", parsed.detailPath);
  
  try {
    const res = await fetchJson<H5ApiResponse<any>>(url);
    const rawSeasons = res.data?.resource?.seasons ?? [];
    
    const seasons = rawSeasons
      .map((item: any) => Number(item.se))
      .filter((value: number) => Number.isInteger(value) && value > 0)
      .sort((a: number, b: number) => a - b);
      
    const season = seasons.includes(fallbackSeason)
      ? fallbackSeason
      : seasons[0] ?? fallbackSeason;
      
    const seasonMeta = rawSeasons.find((item: any) => Number(item.se) === season);
    let episodes = 1;
    if (seasonMeta) {
      if (typeof seasonMeta.allEp === "string" && seasonMeta.allEp.trim()) {
        const epArr = seasonMeta.allEp.split(",").map((v: string) => Number(v.trim())).filter((v: number) => Number.isInteger(v) && v > 0);
        if (epArr.length) episodes = Math.max(...epArr);
      } else if (Number.isInteger(seasonMeta.maxEp) && Number(seasonMeta.maxEp) > 0) {
        episodes = Number(seasonMeta.maxEp);
      }
    }
    
    return {
      seasons: seasons.length ? seasons : [season],
      season,
      episodes,
    };
  } catch (error) {
    console.error("MovieBox getSeriesNavigation error:", error);
    return { seasons: [fallbackSeason], season: fallbackSeason, episodes: 1 };
  }
}

// 6. resolveStreams
export async function resolveStreams(
  id: string,
  options: { season?: number; episode?: number } = {},
): Promise<StreamSource[]> {
  const parsed = parseProviderId(id);
  if (!parsed) return [];
  
  const season = Number.isInteger(options.season) && Number(options.season) > 0 ? Number(options.season) : 0;
  const episode = Number.isInteger(options.episode) && Number(options.episode) > 0 ? Number(options.episode) : 0;
  
  const url = new URL("/wefeed-h5api-bff/subject/play", PLAYBACK_BASE);
  url.searchParams.set("subjectId", parsed.subjectId);
  url.searchParams.set("se", String(season));
  url.searchParams.set("ep", String(episode));
  url.searchParams.set("detailPath", parsed.detailPath);
  url.searchParams.set("streamSignType", "1");
  
  try {
    const res = await fetchJson<H5ApiResponse<any>>(url);
    if (res.code !== 0 || !res.data) return [];
    
    const validSources: StreamSource[] = [];
    let topStreamId: string | null = null;
    
    // We do not have a DASH player in PinFlix (only HLS/Native). 
    // We will extract MP4 fallback streams.
    const mp4Streams = res.data.streams ?? [];
    for (const m of mp4Streams) {
      if (!m.url) continue;
      const resolution = m.resolutions ? `${m.resolutions}p` : "";
      validSources.push({
        url: m.url,
        quality: `MovieBox ${resolution} ${m.codecName || "MP4"}`.trim(),
        protocol: "native",
        priority: Number(m.resolutions) || 0,
      });
      if (!topStreamId) topStreamId = m.id;
    }
    
    // Fetch subtitles
    if (validSources.length > 0 && topStreamId) {
      try {
        const capUrl = new URL("/wefeed-h5api-bff/subject/caption", API_BASE);
        capUrl.searchParams.set("format", "MP4");
        capUrl.searchParams.set("id", topStreamId);
        capUrl.searchParams.set("subjectId", parsed.subjectId);
        capUrl.searchParams.set("detailPath", parsed.detailPath);
        
        const capRes = await fetchJson<H5ApiResponse<any>>(capUrl);
        if (capRes.code === 0 && capRes.data?.captions) {
          const subtitles = capRes.data.captions
            .filter((c: any) => c.url && c.lanName)
            .map((c: any) => ({
              label: c.lanName || c.lan || "Unknown",
              language: c.lan || "un",
              url: c.url,
            }));
            
          if (subtitles.length > 0) {
            for (const source of validSources) {
              source.subtitles = subtitles;
            }
          }
        }
      } catch (err) {
        console.error("MovieBox caption fetch error:", err);
      }
    }
    
    return validSources.sort((a, b) => b.priority - a.priority);
  } catch (error) {
    console.error("MovieBox resolveStreams error:", error);
    return [];
  }
}

// 7. getHomeSections (for page.tsx)
export async function getHomeSections(): Promise<MovieBoxHomeSection[]> {
  const url = new URL("/wefeed-h5api-bff/home?host=movibox.net", API_BASE);
  
  try {
    const res = await fetchJson<H5ApiResponse<any>>(url);
    if (res.code !== 0 || !res.data?.operatingList) return [];
    
    const sections: MovieBoxHomeSection[] = [];
    
    for (const op of res.data.operatingList) {
      if (op.banner?.items?.length) {
        const items = op.banner.items
          .filter((item: any) => item.subject)
          .map((item: any) => {
            const subj = item.subject;
            const kind = subj.subjectType === 2 ? "show" : "movie";
            return {
              id: providerId(subj.subjectId, item.detailPath),
              slug: providerId(subj.subjectId, item.detailPath),
              kind,
              provider: "moviebox",
              providerId: String(subj.subjectId),
              title: subj.title,
              synopsis: subj.description || "",
              year: subj.releaseDate ? parseInt(subj.releaseDate.split("-")[0]) : undefined,
              poster: subj.cover?.url || "",
              backdrop: item.image?.url || subj.cover?.url || "",
              genres: subj.genre ? subj.genre.split(",").map((g: string) => g.trim()) : [],
              rating: subj.imdbRatingValue ? parseFloat(subj.imdbRatingValue) : undefined,
              detailUrl: new URL(`/detail/${item.detailPath}`, SITE_BASE).toString(),
            } as Entertainment;
          });
          
        if (items.length > 0) {
          sections.push({
            id: op.title,
            label: op.title,
            items,
          });
        }
      }
    }
    
    return sections;
  } catch (error) {
    console.error("MovieBox getHomeSections error:", error);
    return [];
  }
}
