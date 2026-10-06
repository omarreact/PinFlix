/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import type { Entertainment, StreamSource } from "@/src/types/catalog";
import type { SeriesNavigation } from "../contracts";

const API_BASE = "https://h5-api.aoneroom.com";
const SITE_BASE = "https://movibox.net";
const PLAYBACK_BASE = "https://movibox.net";

const REQUEST_TIMEOUT_MS = 12_000;

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

function mapItem(item: any, kindFallback?: "movie" | "show"): Entertainment {
  const kind =
    kindFallback ??
    (item.subjectType === 2 || item.subject?.subjectType === 2 ? "show" : "movie");
  const subj = item.subject ?? item;
  const subjectId = subj.subjectId ?? item.subjectId;
  const detailPath =
    item.detailPath ?? subj.detailPath ?? item.subject?.detailPath ?? String(subjectId);
  const id = providerId(subjectId, detailPath);

  return {
    id,
    slug: id,
    kind,
    provider: "moviebox",
    providerId: String(subjectId),
    title: subj.title ?? item.title ?? "Untitled",
    synopsis: subj.description ?? item.description ?? "",
    year: subj.releaseDate
      ? parseInt(String(subj.releaseDate).split("-")[0], 10)
      : item.releaseDate
        ? parseInt(String(item.releaseDate).split("-")[0], 10)
        : undefined,
    poster: subj.cover?.url ?? item.cover?.url ?? "",
    backdrop:
      item.image?.url ??
      (Array.isArray(subj.stills) ? subj.stills[0]?.url : subj.stills?.url) ??
      subj.cover?.url ??
      item.cover?.url ??
      "",
    genres: (subj.genre ?? item.genre)
      ? String(subj.genre ?? item.genre)
          .split(",")
          .map((g: string) => g.trim())
          .filter(Boolean)
      : [],
    rating: subj.imdbRatingValue
      ? parseFloat(subj.imdbRatingValue)
      : item.imdbRatingValue
        ? parseFloat(item.imdbRatingValue)
        : undefined,
    detailUrl: new URL(`/detail/${detailPath}`, SITE_BASE).toString(),
  };
}

async function fetchJson<T>(url: URL | string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = new Headers(init.headers);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (!headers.has("User-Agent")) {
      headers.set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );
    }
    if (!headers.has("Origin")) headers.set("Origin", SITE_BASE);
    if (!headers.has("Referer")) headers.set("Referer", `${SITE_BASE}/`);

    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
      // Avoid long-lived empty cache on edge if upstream was briefly down
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export function canHandleId(id: string): boolean {
  return parseProviderId(id) !== null;
}

/**
 * Search: H5 search endpoints require an auth token we do not hold.
 * Fallback: scan latest movie + series pages and match title / synopsis.
 */
export async function search(query: string, page = 1): Promise<Entertainment[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  try {
    const [movies, shows] = await Promise.all([
      getLatestPage("movie", page),
      getLatestPage("show", page),
    ]);

    const pool = [...movies.items, ...shows.items];
    const matched = pool.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.synopsis.toLowerCase().includes(q) ||
        item.genres.some((g) => g.toLowerCase().includes(q)),
    );

    return [...new Map(matched.map((item) => [item.id, item])).values()];
  } catch (error) {
    console.error("MovieBox search error:", error);
    return [];
  }
}

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

    const items: Entertainment[] = res.data.items.map((item: any) => mapItem(item, kind));

    return {
      items,
      page: parseInt(res.data.pager?.page || String(page), 10),
      hasNextPage: Boolean(res.data.pager?.hasMore),
    };
  } catch (error) {
    console.error("MovieBox getLatestPage error:", error);
    return { items: [], page, hasNextPage: false };
  }
}

export async function getCategories(_kind: "movie" | "show") {
  return [];
}

export async function getCategoryPage(_categoryId: string, _page = 1) {
  return null;
}

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
      year: subj.releaseDate ? parseInt(String(subj.releaseDate).split("-")[0], 10) : undefined,
      poster: subj.cover?.url || "",
      backdrop: Array.isArray(subj.stills) ? subj.stills[0]?.url : subj.stills?.url || "",
      genres: subj.genre
        ? String(subj.genre)
            .split(",")
            .map((g: string) => g.trim())
            .filter(Boolean)
        : [],
      rating: subj.imdbRatingValue ? parseFloat(subj.imdbRatingValue) : undefined,
      cast,
      detailUrl: new URL(`/detail/${parsed.detailPath}`, SITE_BASE).toString(),
    };
  } catch (error) {
    console.error("MovieBox getDetails error:", error);
    return null;
  }
}

export async function getSeriesNavigation(
  id: string,
  requestedSeason = 1,
): Promise<SeriesNavigation> {
  const fallbackSeason =
    Number.isInteger(requestedSeason) && requestedSeason > 0 ? requestedSeason : 1;

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

    const season = seasons.includes(fallbackSeason) ? fallbackSeason : (seasons[0] ?? fallbackSeason);

    const seasonMeta = rawSeasons.find((item: any) => Number(item.se) === season);
    let episodes = 1;
    if (seasonMeta) {
      if (typeof seasonMeta.allEp === "string" && seasonMeta.allEp.trim()) {
        const epArr = seasonMeta.allEp
          .split(",")
          .map((v: string) => Number(v.trim()))
          .filter((v: number) => Number.isInteger(v) && v > 0);
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

export async function resolveStreams(
  id: string,
  options: { season?: number; episode?: number } = {},
): Promise<StreamSource[]> {
  const parsed = parseProviderId(id);
  if (!parsed) return [];

  const season =
    Number.isInteger(options.season) && Number(options.season) > 0 ? Number(options.season) : 0;
  const episode =
    Number.isInteger(options.episode) && Number(options.episode) > 0 ? Number(options.episode) : 0;

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

/**
 * Home operating list includes:
 * - BANNER sections → banner.items (each may nest .subject)
 * - SUBJECTS_MOVIE sections → subjects[] (flat subject objects)
 */
export async function getHomeSections(): Promise<MovieBoxHomeSection[]> {
  const url = new URL("/wefeed-h5api-bff/home?host=movibox.net", API_BASE);

  try {
    const res = await fetchJson<H5ApiResponse<any>>(url);
    if (res.code !== 0 || !res.data?.operatingList) return [];

    const sections: MovieBoxHomeSection[] = [];

    for (const op of res.data.operatingList) {
      const rawItems: any[] =
        (Array.isArray(op.banner?.items) && op.banner.items.length > 0
          ? op.banner.items
          : null) ??
        (Array.isArray(op.subjects) && op.subjects.length > 0 ? op.subjects : null) ??
        [];

      if (!rawItems.length) continue;

      const items = rawItems
        .filter((item: any) => item && (item.subject || item.subjectId))
        .map((item: any) => mapItem(item));

      if (items.length > 0) {
        const label =
          op.title && !String(op.title).startsWith("Banner_")
            ? String(op.title)
            : op.type === "BANNER"
              ? "Featured"
              : String(op.title || "Collection");

        sections.push({
          id: String(op.opId ?? op.title ?? op.position),
          label,
          items,
        });
      }
    }

    return sections;
  } catch (error) {
    console.error("MovieBox getHomeSections error:", error);
    return [];
  }
}
