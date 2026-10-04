import "server-only";

import { createHash } from "node:crypto";
import type {
  CastMember,
  DubVariant,
  Entertainment,
  StreamSource,
  SubtitleTrack,
} from "@/src/types/catalog";
import type {
  ProviderCatalogPage,
  ProviderCategory,
  ProviderHomeFeed,
  ProviderHomeSection,
  ProviderKind,
  SeriesNavigation,
} from "../contracts";

const API_BASE =
  process.env.MOVIEBOX_WEB_API_BASE?.trim().replace(/\/$/, "") ||
  "https://h5-api.aoneroom.com";

const SITE_BASE =
  process.env.MOVIEBOX_WEB_SITE_BASE?.trim().replace(/\/$/, "") ||
  "https://movie-box.co";

const REQUEST_TIMEOUT_MS = 6_000;
const SEARCH_PAGE_SIZE = 24;
const CATALOG_PAGE_SIZE = 36;
const HOME_HOST = "movie-box.co";

type JsonObject = Record<string, unknown>;

type MovieBoxImage = {
  url?: string;
  width?: number;
  height?: number;
};

type MovieBoxTrailer = {
  videoAddress?: {
    url?: string;
    duration?: number;
  };
  cover?: MovieBoxImage;
};

type MovieBoxStaff = {
  staffId?: string | number;
  name?: string;
  character?: string;
  avatarUrl?: string;
  detailPath?: string;
};

type MovieBoxDub = {
  subjectId?: string | number;
  lanName?: string;
  lanCode?: string;
  original?: boolean;
  detailPath?: string;
};

type MovieBoxAccessStrategy = {
  ruleType?: number;
  requiredVipLevel?: number;
  freeEpisodeCount?: number;
  previewSeconds?: number;
};

type MovieBoxWebSubject = {
  subjectId?: string | number;
  subjectType?: number;
  title?: string;
  description?: string;
  releaseDate?: string;
  duration?: number;
  genre?: string;
  cover?: MovieBoxImage;
  stills?: MovieBoxImage | MovieBoxImage[] | null;
  countryName?: string;
  imdbRatingValue?: string | number;
  imdbRatingCount?: number;
  subtitles?: string;
  hasResource?: boolean;
  trailer?: MovieBoxTrailer | null;
  detailPath?: string;
  staffList?: MovieBoxStaff[];
  appointmentCnt?: number;
  appointmentDate?: string;
  corner?: string;
  season?: number;
  dubs?: MovieBoxDub[];
  accessStrategy?: MovieBoxAccessStrategy | null;
  webHighRisk?: boolean;
};

type MovieBoxResolution = {
  resolution?: number;
  epNum?: number;
};

type MovieBoxSeason = {
  se?: number;
  maxEp?: number;
  allEp?: string;
  resolutions?: MovieBoxResolution[];
};

type MovieBoxWebDetail = {
  code?: number;
  message?: string;
  data?: {
    subject?: MovieBoxWebSubject;
    stars?: MovieBoxStaff[];
    resource?: {
      seasons?: MovieBoxSeason[];
      source?: string;
      uploadBy?: string;
    };
    metadata?: {
      title?: string;
      description?: string;
      keyWords?: string;
      image?: string;
    };
    isForbid?: boolean;
    watchTimeLimit?: number;
    accessStrategy?: MovieBoxAccessStrategy | null;
  };
};

type MovieBoxHomeOperation = {
  type?: string;
  position?: number;
  title?: string;
  subjects?: MovieBoxWebSubject[];
  banner?: {
    items?: Array<{
      subject?: MovieBoxWebSubject;
      image?: MovieBoxImage;
      detailPath?: string;
    }>;
  } | null;
  opId?: string | number;
  filters?: Array<{
    title?: string;
    query?: string;
    image?: MovieBoxImage;
  }>;
  genreTopId?: string | number;
  detailPath?: string;
};

type MovieBoxHomeResponse = {
  code?: number;
  message?: string;
  data?: {
    platformList?: Array<{ name?: string; uploadBy?: string }>;
    operatingList?: MovieBoxHomeOperation[];
  };
};

type MovieBoxPager = {
  hasMore?: boolean;
  nextPage?: number | string;
  page?: number | string;
  perPage?: number;
  totalCount?: number;
};

type MovieBoxSubjectListResponse = {
  code?: number;
  message?: string;
  data?: {
    subjectList?: MovieBoxWebSubject[];
    list?: MovieBoxWebSubject[];
    items?: MovieBoxWebSubject[];
    pager?: MovieBoxPager;
  };
};

type MovieBoxPlaybackEntry = {
  format?: string;
  id?: string | number;
  url?: string;
  resolutions?: string | number;
  size?: string | number;
  duration?: number;
  codecName?: string;
  signCookie?: string;
  signHeaderKey?: string;
  vipLocked?: boolean;
  vip_locked?: boolean;
};

type MovieBoxPlaybackResponse = {
  code?: number;
  message?: string;
  data?: {
    streams?: MovieBoxPlaybackEntry[];
    hls?: MovieBoxPlaybackEntry[];
    dash?: MovieBoxPlaybackEntry[];
    hasResource?: boolean;
    limited?: boolean;
    playConfig?: {
      maxResolution?: number;
    };
  };
};

type MovieBoxCaption = {
  lan?: string;
  lanName?: string;
  url?: string;
};

type MovieBoxCaptionResponse = {
  code?: number;
  message?: string;
  data?: {
    captions?: MovieBoxCaption[];
  };
};

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function positiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function uniqueStrings(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
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
    throw new Error(`MovieBox request failed with HTTP ${response.status}.`);
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

function firstImageUrl(stills: MovieBoxWebSubject["stills"]) {
  if (Array.isArray(stills)) {
    return stills.find((item) => item?.url)?.url?.trim() ?? "";
  }
  return stills?.url?.trim() ?? "";
}

function mapCast(staff: MovieBoxStaff[] | undefined): CastMember[] {
  return (staff ?? [])
    .map((item) => {
      const id = String(item.staffId ?? "").trim();
      const name = item.name?.trim() ?? "";
      if (!id || !name) return null;
      return {
        id,
        name,
        ...(item.character?.trim() ? { character: item.character.trim() } : {}),
        ...(item.avatarUrl?.trim() ? { avatar: item.avatarUrl.trim() } : {}),
        ...(item.detailPath?.trim() ? { detailPath: item.detailPath.trim() } : {}),
      } satisfies CastMember;
    })
    .filter((item): item is CastMember => Boolean(item));
}

function mapDubs(dubs: MovieBoxDub[] | undefined): DubVariant[] {
  return (dubs ?? [])
    .map((item) => {
      const subjectId = String(item.subjectId ?? "").trim();
      const detailPath = item.detailPath?.trim() ?? "";
      const label = item.lanName?.trim() ?? "";
      if (!subjectId || !detailPath || !label) return null;

      return {
        id: providerId(subjectId, detailPath),
        label,
        ...(item.lanCode?.trim() ? { languageCode: item.lanCode.trim() } : {}),
        original: item.original === true,
      } satisfies DubVariant;
    })
    .filter((item): item is DubVariant => Boolean(item));
}

function qualityList(seasons: MovieBoxSeason[] | undefined) {
  const values = new Set<number>();
  for (const season of seasons ?? []) {
    for (const item of season.resolutions ?? []) {
      const value = positiveNumber(item.resolution);
      if (value) values.add(value);
    }
  }
  return [...values]
    .sort((left, right) => left - right)
    .map((value) => `${value}p`);
}

function totalEpisodes(seasons: MovieBoxSeason[] | undefined) {
  let total = 0;
  for (const season of seasons ?? []) {
    const parsed = parseEpisodeCount(season);
    total += parsed;
  }
  return total > 0 ? total : undefined;
}

function mapSubject(
  subject: MovieBoxWebSubject,
  extras: {
    stars?: MovieBoxStaff[];
    seasons?: MovieBoxSeason[];
  } = {},
): Entertainment | null {
  const subjectId = subject.subjectId;
  const detailPath = subject.detailPath?.trim();
  const title = subject.title?.trim();

  if (!subjectId || !detailPath || !title) return null;

  const kind = subject.subjectType === 2 ? "show" : "movie";
  const releaseYear = /^\d{4}/.exec(subject.releaseDate ?? "")?.[0];
  const rating = Number(subject.imdbRatingValue);
  const ratingCount = positiveNumber(subject.imdbRatingCount);
  const durationSeconds = positiveNumber(subject.duration);
  const poster = subject.cover?.url?.trim() ?? "";
  const trailerUrl = subject.trailer?.videoAddress?.url?.trim() ?? "";
  const trailerPoster = subject.trailer?.cover?.url?.trim() ?? "";
  const backdrop =
    firstImageUrl(subject.stills) ||
    trailerPoster ||
    poster;
  const dubs = mapDubs(subject.dubs);
  const languages = uniqueStrings([
    subject.corner,
    ...(subject.subtitles ?? "").split(","),
    ...dubs.map((dub) => dub.label),
  ]);
  const cast = mapCast(
    extras.stars?.length
      ? extras.stars
      : subject.staffList,
  );
  const qualities = qualityList(extras.seasons);
  const episodes = kind === "show" ? totalEpisodes(extras.seasons) : undefined;

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
    ...(ratingCount ? { ratingCount } : {}),
    genres: (subject.genre ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    backdrop,
    poster,
    synopsis: subject.description?.trim() ?? "",
    ...(durationSeconds ? { durationSeconds } : {}),
    ...(subject.countryName?.trim() ? { country: subject.countryName.trim() } : {}),
    ...(languages.length ? { languages } : {}),
    ...(subject.corner?.trim() ? { corner: subject.corner.trim() } : {}),
    ...(episodes ? { episodes } : {}),
    ...(qualities.length ? { qualities } : {}),
    playable: subject.hasResource !== false,
    upcoming: subject.hasResource === false || Number(subject.appointmentCnt ?? 0) > 0,
    ...(cast.length ? { cast } : {}),
    ...(dubs.length ? { dubs } : {}),
    ...(trailerUrl
      ? {
          trailer: {
            url: trailerUrl,
            ...(trailerPoster ? { poster: trailerPoster } : {}),
            ...(positiveNumber(subject.trailer?.videoAddress?.duration)
              ? { durationSeconds: Number(subject.trailer?.videoAddress?.duration) }
              : {}),
          },
        }
      : {}),
  };
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

function pagerFromResponse(raw: unknown): MovieBoxPager | undefined {
  const root = asObject(raw);
  const data = asObject(root?.data);
  const pager = asObject(data?.pager);
  return pager ? (pager as MovieBoxPager) : undefined;
}

async function fetchHome() {
  const url = new URL("/wefeed-h5api-bff/home", API_BASE);
  url.searchParams.set("host", HOME_HOST);
  return fetchJson<MovieBoxHomeResponse>(url);
}

async function fetchDetailByPath(detailPath: string) {
  const url = new URL("/wefeed-h5api-bff/detail", API_BASE);
  url.searchParams.set("detailPath", detailPath);
  return fetchJson<MovieBoxWebDetail>(url);
}

function cleanSectionLabel(value: string | undefined) {
  return (value ?? "MovieBox")
    .replace(/^[^A-Za-z0-9]+/, "")
    .trim() || "MovieBox";
}

function sectionKind(items: Entertainment[]): ProviderKind | "mixed" {
  const kinds = new Set(items.map((item) => item.kind));
  if (kinds.size === 1) return items[0]?.kind ?? "mixed";
  return "mixed";
}

function operationSection(operation: MovieBoxHomeOperation): ProviderHomeSection | null {
  const rawSubjects = operation.subjects ?? [];
  if (!rawSubjects.length) return null;

  const items = rawSubjects
    .map((subject) => mapSubject(subject))
    .filter((item): item is Entertainment => Boolean(item));

  if (!items.length) return null;

  const sourceId = String(
    operation.genreTopId ||
    operation.opId ||
    operation.position ||
    cleanSectionLabel(operation.title),
  );

  return {
    id: `mb-rail-${sourceId}`,
    label: cleanSectionLabel(operation.title),
    items,
    kind: sectionKind(items),
    supportsPagination: Boolean(operation.genreTopId),
  };
}

export async function getHomeFeed(): Promise<ProviderHomeFeed> {
  try {
    const response = await fetchHome();
    const operations = response.data?.operatingList ?? [];

    const featured = operations
      .filter((operation) => operation.type === "BANNER")
      .flatMap((operation) => operation.banner?.items ?? [])
      .map((item) => item.subject ? mapSubject(item.subject) : null)
      .find((item): item is Entertainment => Boolean(item));

    const sections = operations
      .filter((operation) =>
        operation.type === "SUBJECTS_MOVIE" ||
        operation.type === "APPOINTMENT_LIST",
      )
      .map(operationSection)
      .filter((item): item is ProviderHomeSection => Boolean(item));

    return {
      featured: featured ?? sections.flatMap((section) => section.items).find((item) => item.playable !== false),
      sections,
    };
  } catch (error) {
    console.error("MovieBox home feed error:", error);

    const [movies, shows] = await Promise.all([
      getLatestPage("movie", 1),
      getLatestPage("show", 1),
    ]);

    const fallbackSections: ProviderHomeSection[] = [
      {
        id: "mb-trending-movies",
        label: "Trending Movies",
        items: movies.items,
        kind: "movie",
        supportsPagination: false,
      },
      {
        id: "mb-trending-series",
        label: "Trending Series",
        items: shows.items,
        kind: "show",
        supportsPagination: false,
      },
    ];
    const sections = fallbackSections.filter((section) => section.items.length > 0);

    return {
      featured: sections.flatMap((section) => section.items).find((item) => item.playable !== false),
      sections,
    };
  }
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
      .map((subject) => mapSubject(subject))
      .filter((item): item is Entertainment => Boolean(item));
  } catch (error) {
    console.error("MovieBox search error:", error);
    return [];
  }
}

export async function getLatestPage(
  kind: ProviderKind,
  page = 1,
): Promise<ProviderCatalogPage> {
  const safePage = Math.max(1, Math.floor(page));
  const url = new URL("/wefeed-h5api-bff/subject/trending", API_BASE);
  url.searchParams.set("tabId", kind === "movie" ? "2" : "5");
  url.searchParams.set("page", String(safePage - 1));
  url.searchParams.set("perPage", String(CATALOG_PAGE_SIZE));

  try {
    const response = await fetchJson<MovieBoxSubjectListResponse>(url);
    const expectedType = kind === "show" ? 2 : 1;
    const items = subjectListFromResponse(response)
      .filter((subject) => subject.subjectType === expectedType)
      .map((subject) => mapSubject(subject))
      .filter((item): item is Entertainment => Boolean(item));
    const pager = response.data?.pager;

    return {
      items,
      page: safePage,
      hasNextPage:
        pager?.hasMore === true ||
        (typeof pager?.nextPage === "number" && pager.nextPage > safePage - 1),
    };
  } catch (error) {
    console.error(`MovieBox trending ${kind} error:`, error);
    return { items: [], page: safePage, hasNextPage: false };
  }
}

export async function getCategories(
  kind: ProviderKind,
): Promise<ProviderCategory[]> {
  try {
    const feed = await getHomeFeed();

    return feed.sections
      .filter((section) =>
        section.supportsPagination &&
        (section.kind === kind || section.kind === "mixed"),
      )
      .map((section) => ({
        id: section.id,
        provider: "moviebox",
        label: section.label,
        group: kind === "movie" ? "movies" : "series",
        kind,
        supportsPagination: section.supportsPagination,
        supportedInPinflix: true,
      }));
  } catch {
    return [];
  }
}

export async function getCategoryPage(
  categoryId: string,
  page = 1,
): Promise<ProviderCatalogPage | null> {
  const match = categoryId.match(/^mb-rail-(\d+)$/);
  if (!match) return null;

  const safePage = Math.max(1, Math.floor(page));
  const url = new URL("/wefeed-h5api-bff/ranking-list/content", API_BASE);
  url.searchParams.set("id", match[1]);
  url.searchParams.set("page", String(safePage));
  url.searchParams.set("perPage", "24");

  try {
    const response = await fetchJson<unknown>(url);
    const items = subjectListFromResponse(response)
      .map((subject) => mapSubject(subject))
      .filter((item): item is Entertainment => Boolean(item));
    const pager = pagerFromResponse(response);

    if (items.length || safePage > 1) {
      return {
        items,
        page: safePage,
        hasNextPage: pager?.hasMore === true,
      };
    }
  } catch (error) {
    console.error("MovieBox category page error:", error);
  }

  if (safePage !== 1) {
    return { items: [], page: safePage, hasNextPage: false };
  }

  const feed = await getHomeFeed();
  const fallback = feed.sections.find((section) => section.id === categoryId);
  return fallback
    ? { items: fallback.items, page: 1, hasNextPage: fallback.supportsPagination }
    : null;
}

export async function getDetails(id: string): Promise<Entertainment | null> {
  const parsed = parseProviderId(id);
  if (!parsed) return null;

  try {
    const detail = await fetchDetailByPath(parsed.detailPath);
    const subject = detail.data?.subject;
    if (!subject) return null;

    const mapped = mapSubject(subject, {
      stars: detail.data?.stars,
      seasons: detail.data?.resource?.seasons,
    });
    if (!mapped) return null;

    return {
      ...mapped,
      id,
      slug: id,
      providerId: parsed.subjectId,
      detailUrl: parsed.detailPath,
    };
  } catch (error) {
    console.error("MovieBox details error:", error);
    return null;
  }
}

export async function getRecommendations(
  id: string,
  page = 1,
): Promise<Entertainment[]> {
  const parsed = parseProviderId(id);
  if (!parsed) return [];

  const url = new URL("/wefeed-h5api-bff/subject/detail-rec", API_BASE);
  url.searchParams.set("subjectId", parsed.subjectId);
  url.searchParams.set("page", String(Math.max(1, Math.floor(page))));
  url.searchParams.set("perPage", "24");

  try {
    const response = await fetchJson<unknown>(url);
    return subjectListFromResponse(response)
      .map((subject) => mapSubject(subject))
      .filter(
        (item): item is Entertainment =>
          item !== null && item.providerId !== parsed.subjectId,
      );
  } catch (error) {
    console.error("MovieBox recommendations error:", error);
    return [];
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
  const codec = entry.codecName?.trim() ?? "";
  const parts = [
    "MovieBox",
    resolution ? `${resolution}p` : "",
    codec ? codec.toUpperCase() : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

function unlockedDirectSource(entry: MovieBoxPlaybackEntry) {
  const url = entry.url?.trim();
  const locked = entry.vipLocked ?? entry.vip_locked;
  if (!url || locked !== false) return false;
  if (entry.signCookie?.trim() || entry.signHeaderKey?.trim()) return false;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
  } catch {
    return false;
  }

  const format = entry.format?.toUpperCase() ?? "";
  if (format === "DASH" || /\.mpd(?:$|[?#])/i.test(url)) return false;

  return true;
}

function mapUnlockedSource(
  entry: MovieBoxPlaybackEntry,
  priority: number,
): StreamSource | null {
  if (!unlockedDirectSource(entry)) return null;

  const url = entry.url!.trim();
  const format = entry.format?.toUpperCase() ?? "";
  const isHls = format === "HLS" || /\.m3u8(?:$|[?#])/i.test(url);

  return {
    url,
    quality: playbackQuality(entry),
    protocol: isHls ? "hls" : "native",
    priority,
  };
}

function subtitleProxyUrl(url: string) {
  return `/api/subtitles?url=${encodeURIComponent(url)}`;
}

async function captionsForSource(
  subjectId: string,
  detailPath: string,
  entry: MovieBoxPlaybackEntry,
): Promise<SubtitleTrack[]> {
  const sourceId = String(entry.id ?? "").trim();
  const format = entry.format?.toUpperCase().trim() ?? "";
  if (!sourceId || !["DASH", "HLS", "MP4"].includes(format)) return [];

  const url = new URL("/wefeed-h5api-bff/subject/caption", API_BASE);
  url.searchParams.set("format", format);
  url.searchParams.set("id", sourceId);
  url.searchParams.set("subjectId", subjectId);
  url.searchParams.set("detailPath", detailPath);

  try {
    const response = await fetchJson<MovieBoxCaptionResponse>(url);
    const seen = new Set<string>();

    return (response.data?.captions ?? [])
      .map((caption) => {
        const sourceUrl = caption.url?.trim() ?? "";
        if (!sourceUrl || seen.has(sourceUrl)) return null;

        try {
          const parsed = new URL(sourceUrl);
          if (parsed.protocol !== "https:") return null;
        } catch {
          return null;
        }

        seen.add(sourceUrl);
        const language = caption.lan?.trim() || caption.lanName?.trim() || "und";
        return {
          label: caption.lanName?.trim() || language,
          language,
          url: subtitleProxyUrl(sourceUrl),
        } satisfies SubtitleTrack;
      })
      .filter((item): item is SubtitleTrack => Boolean(item));
  } catch {
    return [];
  }
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
  url.searchParams.set("supportCodecs[hevc]", "1");
  url.searchParams.set("supportCodecs[h264]", "1");

  try {
    const response = await fetchJson<MovieBoxPlaybackResponse>(url);
    if (response.code !== 0 || response.data?.hasResource === false) return [];

    const candidates = [
      ...(response.data?.hls ?? []),
      ...(response.data?.streams ?? []),
    ].filter(unlockedDirectSource);

    const seen = new Set<string>();
    const unique = candidates.filter((entry) => {
      const sourceUrl = entry.url?.trim() ?? "";
      if (!sourceUrl || seen.has(sourceUrl)) return false;
      seen.add(sourceUrl);
      return true;
    });

    const mapped = await Promise.all(
      unique.map(async (entry, index) => {
        const source = mapUnlockedSource(entry, 20 + index);
        if (!source) return null;
        const subtitles = await captionsForSource(
          parsed.subjectId,
          parsed.detailPath,
          entry,
        );
        return subtitles.length ? { ...source, subtitles } : source;
      }),
    );

    return mapped.filter((source): source is StreamSource => Boolean(source));
  } catch (error) {
    console.error("MovieBox playback error:", error);
    return [];
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

export function canHandleId(id: string) {
  return parseProviderId(id) !== null;
}
