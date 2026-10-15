/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Entertainment, StreamSource } from "@/src/types/catalog";
import type { ProviderCatalogPage, SeriesNavigation } from "../contracts";
import { cache } from "react";
import { extractSearchItems, validSearchSubject } from "./search-response";
import { getSearchSession, invalidateSearchSession } from "./search-session";

const API_BASE = "https://h5-api.aoneroom.com";
const SITE_BASE = "https://movibox.net";
const PLAYBACK_BASE = "https://h5-api.aoneroom.com";

const REQUEST_TIMEOUT_MS = 15_000;

function formatError(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

function upstreamLabel(input: URL | string) {
  try {
    const url = input instanceof URL ? input : new URL(input);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return String(input);
  }
}

type H5ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

class ProviderHttpError extends Error {
  constructor(
    message: string,
    readonly tokenRejected: boolean,
  ) {
    super(message);
  }
}

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
    (Number(item.subjectType ?? item.subject?.subjectType) === 2
      ? "show"
      : "movie");
  const subj = item.subject ?? item;
  const subjectId = subj.subjectId ?? item.subjectId;
  const detailPath =
    item.detailPath ??
    subj.detailPath ??
    item.subject?.detailPath ??
    String(subjectId);
  const id = providerId(subjectId, detailPath);

  return {
    id,
    slug: id,
    kind,
    provider: "moviebox",
    providerId: String(subjectId),
    category: subj.isPornographic === true ? "Adult" : undefined,
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
    genres:
      (subj.genre ?? item.genre)
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

async function fetchJson<T>(
  url: URL | string,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json, text/plain, */*");
    headers.set("Accept-Language", "en-US,en;q=0.9");
    headers.set(
      "X-Client-Info",
      JSON.stringify({
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      }),
    );
    headers.set("X-Source", "");
    headers.set("X-Request-Lang", "en");
    if (!headers.has("User-Agent")) {
      headers.set(
        "User-Agent",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      );
    }
    if (!headers.has("Origin")) headers.set("Origin", SITE_BASE);
    if (!headers.has("Referer")) headers.set("Referer", `${SITE_BASE}/`);
    if (!headers.has("sec-fetch-site"))
      headers.set("sec-fetch-site", "same-site");
    if (!headers.has("sec-fetch-mode")) headers.set("sec-fetch-mode", "cors");
    if (!headers.has("sec-fetch-dest")) headers.set("sec-fetch-dest", "empty");

    const response = await fetch(url, {
      ...init,
      headers,
      signal: init.signal
        ? AbortSignal.any([controller.signal, init.signal])
        : controller.signal,
      // Edge/Workers: avoid Next data-cache holding empty failures
      cache: "no-store",
    });

    const body = await response.text();
    const target = upstreamLabel(url);

    if (!response.ok) {
      let tokenRejected = response.status === 401;
      if (response.status === 400) {
        try {
          tokenRejected = JSON.parse(body).message === "invalid token";
        } catch {
          /* Non-JSON upstream error. */
        }
      }
      throw new ProviderHttpError(
        `${target} returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`,
        tokenRejected,
      );
    }

    try {
      return JSON.parse(body) as T;
    } catch {
      throw new Error(
        `${target} returned invalid JSON (HTTP ${response.status}, content-type=${response.headers.get("content-type") ?? "unknown"}, bytes=${body.length})`,
      );
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

export function canHandleId(id: string): boolean {
  return parseProviderId(id) !== null;
}

export class ProviderSearchUnavailable extends Error {
  constructor() {
    super("Video provider search is temporarily unavailable");
    this.name = "ProviderSearchUnavailable";
  }
}

export async function search(
  query: string,
  page = 1,
  kind: "all" | "movie" | "show" = "all",
): Promise<Entertainment[]> {
  return (await searchPage(query, page, kind)).items;
}

export async function searchPage(
  query: string,
  page = 1,
  kind: "all" | "movie" | "show" = "all",
): Promise<ProviderCatalogPage> {
  const keyword = query.trim().slice(0, 100);
  const safePage = Number.isInteger(page)
    ? Math.max(1, Math.min(page, 100))
    : 1;
  if (keyword.length < 2)
    return { items: [], page: safePage, hasNextPage: false };
  const url = new URL("/wefeed-h5api-bff/subject/search", API_BASE);
  const signal = AbortSignal.timeout(8000);

  async function queryType(subjectType: number): Promise<ProviderCatalogPage> {
    let res: H5ApiResponse<unknown> | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await getSearchSession(signal);
      try {
        res = await fetchJson<H5ApiResponse<unknown>>(
          url,
          {
            method: "POST",
            signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              keyword,
              page: safePage,
              perPage: 30,
              subjectType,
            }),
          },
          4_000,
        );
        break;
      } catch (error) {
        if (
          !(error instanceof ProviderHttpError) ||
          !error.tokenRejected ||
          attempt
        )
          throw error;
        invalidateSearchSession(token);
      }
    }
    if (!res) throw new ProviderSearchUnavailable();
    if (res.code !== 0)
      throw new Error("Provider returned a non-success search status");
    const items = extractSearchItems(res.data);
    if (items === null)
      throw new Error("Provider returned an unrecognized search response");
    const mapped = items
      .filter(validSearchSubject)
      .map((item) => mapItem(item))
      .filter(
        (item) =>
          item.title !== "Untitled" && (kind === "all" || item.kind === kind),
      );
    const pager =
      res.data && typeof res.data === "object"
        ? (res.data as { pager?: { hasMore?: boolean } }).pager
        : undefined;
    return {
      items: mapped,
      page: safePage,
      hasNextPage:
        typeof pager?.hasMore === "boolean"
          ? pager.hasMore
          : items.length >= 30,
    };
  }

  const mainType = kind === "movie" ? 1 : kind === "show" ? 2 : 0;
  let initial: ProviderCatalogPage = {
    items: [],
    page: safePage,
    hasNextPage: false,
  };
  let succeeded = false;
  try {
    initial = await queryType(mainType);
    succeeded = true;
  } catch (error) {
    console.warn("Primary provider search failed:", formatError(error));
  }
  if (initial.items.length > 0) {
    return { ...initial, items: distinctById(initial.items) };
  }

  // A zero-result generic query is not proof that an indexed series is absent.
  // Retry the same provider using its movie/TV-specific indexes. Unlike the old
  // first-page fallback, this searches by title across the provider index.
  const secondary = kind === "all" ? [1, 2] : [0];
  const variants = await Promise.allSettled(secondary.map(queryType));
  const results = [...initial.items];
  let hasNextPage = initial.hasNextPage;
  for (const variant of variants) {
    if (variant.status === "fulfilled") {
      succeeded = true;
      results.push(...variant.value.items);
      hasNextPage ||= variant.value.hasNextPage;
    } else {
      console.warn(
        "Alternate provider search failed:",
        formatError(variant.reason),
      );
    }
  }
  if (!succeeded) throw new ProviderSearchUnavailable();
  return { items: distinctById(results), page: safePage, hasNextPage };
}

function distinctById(items: Entertainment[]): Entertainment[] {
  return [
    ...new Map(
      items
        .filter((item) => canHandleId(item.id))
        .map((item) => [item.id, item]),
    ).values(),
  ];
}

async function homepagePageFallback(kind: "movie" | "show", page: number) {
  // The provider's H5 homepage feed is independent of the subject/filter API.
  // It can repopulate movie and TV shelves when filtering is down.
  if (page !== 1) return { items: [], page, hasNextPage: false };
  const sections = await getHomeSectionsCached();
  const items = distinctById(sections.flatMap((section) => section.items))
    .filter((item) => item.kind === kind)
    .slice(0, 56);
  if (items.length)
    console.info(
      "PinFlix catalogue recovered using provider home feed:",
      kind,
      items.length,
    );
  return { items, page, hasNextPage: false };
}

export async function getLatestPage(
  kind: "movie" | "show",
  page = 1,
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  const channelId = kind === "movie" ? 1 : 2;
  const url = new URL("/wefeed-h5api-bff/subject/filter", API_BASE);
  try {
    const res = await fetchJson<H5ApiResponse<unknown>>(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, perPage: 28, channelId }),
      },
      Math.min(timeoutMs, 3500),
    );

    if (res.code === 0) {
      const raw = extractSearchItems(res.data);
      if (raw !== null) {
        const items = distinctById(
          raw.filter(validSearchSubject).map((item) => mapItem(item, kind)),
        );
        if (items.length || page > 1) {
          const pager =
            res.data && typeof res.data === "object"
              ? (
                  res.data as {
                    pager?: { page?: string | number; hasMore?: boolean };
                  }
                ).pager
              : undefined;
          return {
            items,
            page: Number(pager?.page) || page,
            hasNextPage: Boolean(pager?.hasMore),
          };
        }
      }
    }
    console.warn(
      "MovieBox category filter returned no usable items:",
      kind,
      res.code,
    );
  } catch (error) {
    console.warn(
      "MovieBox category filter unavailable:",
      kind,
      formatError(error),
    );
  }

  return homepagePageFallback(kind, page);
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
    const res = await fetchJson<H5ApiResponse<any>>(url, {}, 6000);
    if (res.code !== 0 || !res.data?.subject) return null;

    const subj = res.data.subject;
    const kind = subj.subjectType === 2 ? "show" : "movie";

    const cast = res.data.stars
      ?.filter((star: any) => Number(star.staffType) === 1)
      .map((star: any) => ({
        name: star.name,
        role: star.character,
      }));

    return {
      id,
      slug: id,
      kind,
      provider: "moviebox",
      providerId: String(subj.subjectId),
      category: subj.isPornographic === true ? "Adult" : undefined,
      title: subj.title,
      synopsis: subj.description || "",
      year: subj.releaseDate
        ? parseInt(String(subj.releaseDate).split("-")[0], 10)
        : undefined,
      poster: subj.cover?.url || "",
      backdrop: Array.isArray(subj.stills)
        ? subj.stills[0]?.url
        : subj.stills?.url || "",
      genres: subj.genre
        ? String(subj.genre)
            .split(",")
            .map((g: string) => g.trim())
            .filter(Boolean)
        : [],
      rating: subj.imdbRatingValue
        ? parseFloat(subj.imdbRatingValue)
        : undefined,
      cast,
      country: subj.countryName || undefined,
      audioVersions: (subj.dubs ?? [])
        .filter(
          (dub: any) =>
            dub.type === 0 &&
            typeof dub.detailPath === "string" &&
            /^\d+$/.test(String(dub.subjectId)),
        )
        .map((dub: any) => ({
          id: providerId(dub.subjectId, dub.detailPath),
          language: String(dub.lanCode),
          dubbed: !dub.original,
        })),
      audioLanguages: (subj.dubs ?? [])
        .filter(
          (dub: any) =>
            dub.type === 0 && String(dub.subjectId) === String(subj.subjectId),
        )
        .map((dub: any) => String(dub.lanCode)),
      languages: (subj.dubs ?? [])
        .filter(
          (dub: any) =>
            dub.type === 0 && String(dub.subjectId) === String(subj.subjectId),
        )
        .map((dub: any) => {
          try {
            return (
              new Intl.DisplayNames(["en"], { type: "language" }).of(
                dub.lanCode,
              ) || dub.lanCode
            );
          } catch {
            return dub.lanCode;
          }
        }),
      dubbed: (subj.dubs ?? []).some(
        (dub: any) =>
          dub.type === 0 &&
          !dub.original &&
          String(dub.subjectId) === String(subj.subjectId),
      ),
      resolutions: [
        ...new Set<number>(
          (res.data.resource?.seasons ?? []).flatMap((season: any) =>
            (season.resolutions ?? [])
              .map((value: any) => Number(value.resolution))
              .filter((value: number) => Number.isFinite(value) && value > 0),
          ),
        ),
      ],
      detailUrl: new URL(`/detail/${parsed.detailPath}`, SITE_BASE).toString(),
    };
  } catch (error) {
    console.error("MovieBox getDetails error:", formatError(error));
    return null;
  }
}

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
    throw new Error("Invalid series ID");
  }

  const url = new URL("/wefeed-h5api-bff/detail", API_BASE);
  url.searchParams.set("detailPath", parsed.detailPath);

  try {
    const res = await fetchJson<H5ApiResponse<any>>(url);
    if (res.code !== 0 || !Array.isArray(res.data?.resource?.seasons)) {
      throw new Error("Series episode information is unavailable");
    }
    const rawSeasons = res.data?.resource?.seasons ?? [];

    const seasons = rawSeasons
      .map((item: any) => Number(item.se))
      .filter((value: number) => Number.isInteger(value) && value >= 0)
      .map((value: number) => (value === 0 ? 1 : value))
      .filter(
        (value: number, index: number, arr: number[]) =>
          arr.indexOf(value) === index,
      )
      .sort((a: number, b: number) => a - b);

    const season = seasons.includes(fallbackSeason)
      ? fallbackSeason
      : (seasons[0] ?? fallbackSeason);

    const seasonMeta =
      rawSeasons.find((item: any) => Number(item.se) === season) ??
      rawSeasons.find((item: any) => Number(item.se) === 0) ??
      rawSeasons[0];

    let episodes = 0;
    let episodeNumbers: number[] = [];
    if (seasonMeta) {
      if (typeof seasonMeta.allEp === "string" && seasonMeta.allEp.trim()) {
        const epArr = seasonMeta.allEp
          .split(",")
          .map((v: string) => Number(v.trim()))
          .filter((v: number) => Number.isInteger(v) && v > 0);
        episodeNumbers = [...new Set<number>(epArr)].sort((a, b) => a - b);
        if (episodeNumbers.length) episodes = episodeNumbers[episodeNumbers.length - 1];
      } else if (
        Number.isInteger(Number(seasonMeta.maxEp)) &&
        Number(seasonMeta.maxEp) > 0
      ) {
        episodes = Number(seasonMeta.maxEp);
      }
    }

    return {
      seasons: seasons.length ? seasons : [season],
      season,
      episodes,
      ...(episodeNumbers.length ? { episodeNumbers } : {}),
    };
  } catch (error) {
    console.error("MovieBox getSeriesNavigation error:", formatError(error));
    throw error;
  }
}

function pushStream(
  list: StreamSource[],
  url: string | undefined | null,
  quality: string,
  protocol: StreamSource["protocol"],
  priority: number,
) {
  if (!url || typeof url !== "string") return;
  if (!/^https?:\/\//i.test(url)) return;
  list.push({ url, quality, protocol, priority });
}

export async function resolveStreams(
  id: string,
  options: { season?: number; episode?: number } = {},
): Promise<StreamSource[]> {
  const parsed = parseProviderId(id);
  if (!parsed) return [];

  const season =
    Number.isInteger(options.season) && Number(options.season) > 0
      ? Number(options.season)
      : 0;
  const episode =
    Number.isInteger(options.episode) && Number(options.episode) > 0
      ? Number(options.episode)
      : 0;

  const validSources: StreamSource[] = [];
  let topStreamId: string | null = null;

  const playUrl = new URL("/wefeed-h5api-bff/subject/play", PLAYBACK_BASE);
  playUrl.searchParams.set("subjectId", parsed.subjectId);
  playUrl.searchParams.set("se", String(season));
  playUrl.searchParams.set("ep", String(episode || (season > 0 ? 1 : 0)));
  playUrl.searchParams.set("detailPath", parsed.detailPath);
  playUrl.searchParams.set("streamSignType", "1");

  try {
    const playerUrl = new URL(`/movies/${parsed.detailPath}`, SITE_BASE);
    playerUrl.searchParams.set("id", parsed.subjectId);
    playerUrl.searchParams.set("type", "/movie/detail");
    playerUrl.searchParams.set("detailSe", season > 0 ? String(season) : "");
    playerUrl.searchParams.set("detailEp", episode > 0 ? String(episode) : "");
    playerUrl.searchParams.set("lang", "en");

    const res = await fetchJson<H5ApiResponse<any>>(playUrl, {
      headers: { Referer: playerUrl.toString() },
    });
    if (res.code === 0 && res.data) {
      const mp4Streams = res.data.streams ?? [];
      for (const m of mp4Streams) {
        if (!m?.url) continue;
        const resolution = m.resolutions ? `${m.resolutions}p` : "";
        pushStream(
          validSources,
          m.url,
          `MovieBox ${resolution} ${m.codecName || "MP4"}`.trim(),
          "native",
          Number(m.resolutions) || 50,
        );
        if (!topStreamId) topStreamId = m.id;
      }

      for (const h of res.data.hls ?? []) {
        const streamUrl = h?.url || h?.playUrl || h;
        if (typeof streamUrl === "string") {
          pushStream(
            validSources,
            streamUrl,
            `MovieBox HLS ${h?.resolutions ? h.resolutions + "p" : ""}`.trim(),
            "hls",
            Number(h?.resolutions) || 40,
          );
        }
      }

      // Do not expose MPEG-DASH as a native <video> source. The current player
      // has HLS.js support but no DASH engine, so advertising DASH here creates
      // a guaranteed playback failure before failover.
    }
  } catch (error) {
    console.error("MovieBox resolveStreams play error:", formatError(error));
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
            if (source.protocol !== "embed") source.subtitles = subtitles;
          }
        }
      }
    } catch (err) {
      console.error("MovieBox caption fetch error:", formatError(err));
    }
  }

  return validSources.sort((a, b) => b.priority - a.priority);
}

export async function getHomeSections(): Promise<MovieBoxHomeSection[]> {
  // Read-only provider discovery fallback. No change to playback origin/CDN.
  // The second host is an H5 domain published for the same provider; do not
  // manufacture movie records or use TMDB listings as playable titles.
  const origins = [API_BASE, "https://h5.aoneroom.com"];
  async function readHome(origin: string): Promise<any[]> {
    const url = new URL("/wefeed-h5api-bff/home", origin);
    url.searchParams.set("host", "movibox.net");
    url.searchParams.set("channel", "1");
    const res = await fetchJson<H5ApiResponse<any>>(url, {}, 3500);
    const operations = res.data?.operatingList;
    if (res.code !== 0 || !Array.isArray(operations) || !operations.length) {
      throw new Error("Provider homepage returned no usable sections");
    }
    return operations;
  }
  let operations: any[];
  try {
    // Either provider host may serve the same read-only H5 feed. The first
    // usable response wins; a slow/broken mirror does not stall the UI.
    operations = await Promise.any(origins.map(readHome));
  } catch (error) {
    console.warn(
      "All MovieBox home-feed endpoints unavailable:",
      formatError(error),
    );
    return [];
  }
  try {
    const sections: MovieBoxHomeSection[] = [];

    for (const op of operations) {
      const rawItems: any[] =
        (Array.isArray(op.banner?.items) && op.banner.items.length > 0
          ? op.banner.items
          : null) ??
        (Array.isArray(op.subjects) && op.subjects.length > 0
          ? op.subjects
          : null) ??
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
    console.error("MovieBox getHomeSections error:", formatError(error));
    return [];
  }
}

// Request-scoped deduplication: movie and TV shelves reuse one provider home
// fetch if the category filter fails in both branches on the same page.
const getHomeSectionsCached = cache(getHomeSections);
