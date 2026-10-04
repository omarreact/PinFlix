import "server-only";

import { createHash } from "node:crypto";
import type { Entertainment, StreamSource } from "@/src/types/catalog";
import type { SeriesNavigation } from "../contracts";

const API_BASE =
  process.env.MOVIEBOX_WEB_API_BASE?.trim().replace(/\/$/, "") ||
  "https://h5-api.aoneroom.com";

const SITE_BASE =
  process.env.MOVIEBOX_WEB_SITE_BASE?.trim().replace(/\/$/, "") ||
  "https://movie-box.co";

const REQUEST_TIMEOUT_MS = 5_000;
const SEARCH_PAGE_SIZE = 20;

type JsonObject = Record<string, unknown>;

type MovieBoxWebSubject = {
  subjectId?: string | number;
  subjectType?: number;
  title?: string;
  description?: string;
  releaseDate?: string;
  duration?: number;
  genre?: string;
  cover?: { url?: string };
  stills?: { url?: string } | Array<{ url?: string }>;
  imdbRatingValue?: string | number;
  hasResource?: boolean;
  detailPath?: string;
};

type MovieBoxSeason = {
  se?: number;
  maxEp?: number;
  allEp?: string;
};

type MovieBoxWebDetail = {
  code?: number;
  message?: string;
  data?: {
    subject?: MovieBoxWebSubject;
    resource?: {
      seasons?: MovieBoxSeason[];
    };
  };
};

type MovieBoxPlaybackEntry = {
  format?: string;
  url?: string;
  resolutions?: string | number;
  codecName?: string;
  vipLocked?: boolean;
};

type MovieBoxPlaybackResponse = {
  code?: number;
  message?: string;
  data?: {
    streams?: MovieBoxPlaybackEntry[];
    hls?: MovieBoxPlaybackEntry[];
    dash?: MovieBoxPlaybackEntry[];
    hasResource?: boolean;
  };
};

type MovieBoxSubjectListResponse = {
  code?: number;
  message?: string;
  data?: {
    subjectList?: MovieBoxWebSubject[];
    pager?: {
      hasMore?: boolean;
      nextPage?: number;
      page?: number;
      perPage?: number;
      totalCount?: number;
    };
  };
};

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function guestClientToken() {
  const seconds = Math.floor(Date.now() / 1000);
  const reversed = String(seconds).split("").reverse().join("");
  const digest = createHash("md5").update(reversed).digest("hex");
  return `${seconds},${digest}`;
}

function requestHeaders(hasBody = false) {
  const headers = new Headers({
    Accept: "application/json",
    "X-Client-Info": JSON.stringify({ timezone: "UTC" }),
    "X-Request-Lang": "en",
    "X-Client-Token": guestClientToken(),
    "X-Vip-Restrict": "1",
    "X-No-High-Risk-Restrict": "0",
    Origin: SITE_BASE,
    Referer: `${SITE_BASE}/`,
  });

  if (hasBody) headers.set("Content-Type", "application/json");
  return headers;
}

async function fetchJson<T>(
  url: URL,
  init: RequestInit = {},
): Promise<T> {
  const hasBody = Boolean(init.body);
  const response = await fetch(url, {
    ...init,
    headers: requestHeaders(hasBody),
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`MovieBox web request failed with HTTP ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

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

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function subjectListFromResponse(raw: unknown): MovieBoxWebSubject[] {
  const root = asObject(raw);
  const data = asObject(root?.data);
  const candidates = [
    data?.subjectList,
    data?.list,
    data?.items,
    root?.subjectList,
    root?.list,
    root?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is MovieBoxWebSubject =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      );
    }
  }

  return [];
}

function mapSubject(subject: MovieBoxWebSubject): Entertainment | null {
  const subjectId = subject.subjectId;
  const detailPath = subject.detailPath?.trim();
  const title = subject.title?.trim();

  if (!subjectId || !detailPath || !title || subject.hasResource === false) {
    return null;
  }

  const kind = subject.subjectType === 2 ? "show" : "movie";
  const releaseYear = /^\d{4}/.exec(subject.releaseDate ?? "")?.[0];
  const rating = Number(subject.imdbRatingValue);
  const poster = subject.cover?.url?.trim() ?? "";
  const stills = subject.stills;
  const backdrop =
    (Array.isArray(stills)
      ? stills.find((item) => item?.url)?.url?.trim()
      : stills?.url?.trim()) ||
    poster;

  return {
    id: providerId(subjectId, detailPath),
    slug: providerId(subjectId, detailPath),
    provider: "moviebox",
    providerId: String(subjectId),
    detailUrl: detailPath,
    title,
    kind,
    ...(releaseYear ? { year: Number(releaseYear) } : {}),
    ...(Number.isFinite(rating) ? { rating } : {}),
    genres: (subject.genre ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    backdrop,
    poster,
    synopsis: subject.description?.trim() ?? "",
  };
}

async function fetchDetailByPath(detailPath: string) {
  const url = new URL("/wefeed-h5api-bff/detail", API_BASE);
  url.searchParams.set("detailPath", detailPath);
  return fetchJson<MovieBoxWebDetail>(url);
}

export async function search(
  query: string,
  page = 1,
): Promise<Entertainment[]> {
  const keyword = query.trim();
  if (!keyword) return [];

  const url = new URL("/wefeed-h5api-bff/subject/search", API_BASE);

  try {
    const response = await fetchJson<unknown>(url, {
      method: "POST",
      body: JSON.stringify({
        keyword,
        page: Math.max(1, Math.floor(page)),
        perPage: SEARCH_PAGE_SIZE,
        subjectType: 0,
      }),
    });

    return subjectListFromResponse(response)
      .map(mapSubject)
      .filter((item): item is Entertainment => Boolean(item));
  } catch (error) {
    console.error("MovieBox web search error:", error);
    return [];
  }
}

export async function getLatestPage(
  kind: "movie" | "show",
  page = 1,
): Promise<{ items: Entertainment[]; page: number; hasNextPage: boolean }> {
  const safePage = Math.max(1, Math.floor(page));
  const url = new URL("/wefeed-h5api-bff/subject/trending", API_BASE);
  url.searchParams.set("page", String(safePage - 1));
  url.searchParams.set("perPage", "36");

  try {
    const response = await fetchJson<MovieBoxSubjectListResponse>(url);
    const expectedType = kind === "show" ? 2 : 1;
    const items = (response.data?.subjectList ?? [])
      .filter((subject) => subject.subjectType === expectedType)
      .map(mapSubject)
      .filter((item): item is Entertainment => Boolean(item));

    return {
      items,
      page: safePage,
      hasNextPage: response.data?.pager?.hasMore === true,
    };
  } catch (error) {
    console.error(`MovieBox trending ${kind} error:`, error);
    return { items: [], page: safePage, hasNextPage: false };
  }
}

export async function probeMovieBoxConnectivity(timeoutMs = 2_500) {
  const url = new URL("/wefeed-h5api-bff/subject/trending", API_BASE);
  url.searchParams.set("page", "0");
  url.searchParams.set("perPage", "1");
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: requestHeaders(false),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

    return {
      reachable: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      outcome: response.ok ? "reachable" : "http_error",
    } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    return {
      reachable: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      outcome:
        message.includes("timeout") || message.includes("aborted")
          ? "timeout"
          : "network_error",
    } as const;
  }
}

export async function getDetails(id: string): Promise<Entertainment | null> {
  const parsed = parseProviderId(id);
  if (!parsed) return null;

  try {
    const detail = await fetchDetailByPath(parsed.detailPath);
    const mapped = detail.data?.subject
      ? mapSubject(detail.data.subject)
      : null;

    if (!mapped) return null;

    return {
      ...mapped,
      id,
      slug: id,
      providerId: parsed.subjectId,
      detailUrl: parsed.detailPath,
    };
  } catch (error) {
    console.error("MovieBox web details error:", error);
    return null;
  }
}

function parseEpisodeCount(season: MovieBoxSeason | undefined) {
  if (!season) return 1;

  if (typeof season.allEp === "string" && season.allEp.trim()) {
    const episodes = season.allEp
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);
    if (episodes.length) return Math.max(...episodes);
  }

  return Number.isInteger(season.maxEp) && Number(season.maxEp) > 0
    ? Number(season.maxEp)
    : 1;
}

export async function getSeriesNavigation(
  id: string,
  requestedSeason = 1,
): Promise<SeriesNavigation> {
  const parsed = parseProviderId(id);
  const fallbackSeason =
    Number.isInteger(requestedSeason) && requestedSeason > 0
      ? requestedSeason
      : 1;

  if (!parsed) {
    return { seasons: [fallbackSeason], season: fallbackSeason, episodes: 1 };
  }

  try {
    const detail = await fetchDetailByPath(parsed.detailPath);
    const rawSeasons = detail.data?.resource?.seasons ?? [];
    const seasons = rawSeasons
      .map((item) => Number(item.se))
      .filter((value) => Number.isInteger(value) && value > 0)
      .sort((left, right) => left - right);

    const season = seasons.includes(fallbackSeason)
      ? fallbackSeason
      : seasons[0] ?? fallbackSeason;
    const seasonMeta = rawSeasons.find((item) => Number(item.se) === season);

    return {
      seasons: seasons.length ? seasons : [season],
      season,
      episodes: parseEpisodeCount(seasonMeta),
    };
  } catch {
    return { seasons: [fallbackSeason], season: fallbackSeason, episodes: 1 };
  }
}

function playbackQuality(entry: MovieBoxPlaybackEntry) {
  const resolution = String(entry.resolutions ?? "").trim();
  const codec = firstString(entry.codecName);
  const parts = [
    "MovieBox",
    resolution ? `${resolution}p` : "",
    codec ? codec.toUpperCase() : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

function mapUnlockedSource(entry: MovieBoxPlaybackEntry): StreamSource | null {
  const url = entry.url?.trim();
  if (!url || entry.vipLocked !== false) return null;

  const format = entry.format?.toUpperCase() ?? "";
  const isHls =
    format === "HLS" ||
    /\.m3u8(?:$|[?#])/i.test(url);

  // The captured web flow marks DASH renditions as VIP-locked and requires
  // provider-controlled request headers. PinFlix intentionally does not
  // replay or transform that protected material. Only explicitly unlocked
  // direct HLS/MP4 sources are eligible for fallback playback.
  if (format === "DASH" || /\.mpd(?:$|[?#])/i.test(url)) return null;

  return {
    url,
    quality: playbackQuality(entry),
    protocol: isHls ? "hls" : "native",
    priority: 20,
  };
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

  const url = new URL("/wefeed-h5api-bff/subject/play", SITE_BASE);
  url.searchParams.set("subjectId", parsed.subjectId);
  url.searchParams.set("se", String(season));
  url.searchParams.set("ep", String(episode));
  url.searchParams.set("detailPath", parsed.detailPath);
  url.searchParams.set("streamSignType", "1");
  url.searchParams.set("supportCodecs[h264]", "1");

  try {
    const response = await fetchJson<MovieBoxPlaybackResponse>(url);
    if (response.code !== 0 || response.data?.hasResource === false) return [];

    const candidates = [
      ...(response.data?.streams ?? []),
      ...(response.data?.hls ?? []),
    ];

    const seen = new Set<string>();
    return candidates
      .map(mapUnlockedSource)
      .filter((source): source is StreamSource => {
        if (!source || seen.has(source.url)) return false;
        seen.add(source.url);
        return true;
      });
  } catch (error) {
    console.error("MovieBox web playback error:", error);
    return [];
  }
}

export function canHandleId(id: string) {
  return parseProviderId(id) !== null;
}
