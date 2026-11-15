import { z } from "zod";
import type {
  ProviderCatalogPage,
  ProviderCategory,
  ProviderKind,
  SeriesNavigation,
} from "../contracts";
import type { Entertainment, StreamSource } from "@/src/types/catalog";

const GatewayTitleSchema = z.object({
  id: z.string().regex(/^(movie|series)-\d+$/),
  providerId: z.string().regex(/^\d+$/),
  kind: z.enum(["movie", "series"]),
  title: z.string().min(1).max(400),
  poster: z.string().nullable().optional(),
  backdrop: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  category: z.string().optional(),
  language: z.string().nullable().optional(),
  quality: z.string().nullable().optional(),
  rating: z.union([z.string(), z.number()]).nullable().optional(),
  synopsis: z.string().optional(),
  genres: z.array(z.string()).optional(),
  cast: z.array(z.string()).optional(),
  seasons: z.array(z.number().int().positive()).optional(),
  country: z.string().nullable().optional(),
});

const GatewayCategorySchema = z.object({
  name: z.string().min(1).max(160),
  kind: z.enum(["movie", "series"]),
  mature: z.boolean().optional(),
});

const GatewayCatalogueSchema = z.object({
  items: z.array(GatewayTitleSchema),
  categories: z.array(GatewayCategorySchema).optional().default([]),
  hasNext: z.boolean().optional().default(false),
  page: z.number().int().positive().optional().default(1),
  stale: z.boolean().optional().default(false),
  offlineMode: z.boolean().optional().default(false),
});

const GatewayEpisodeSchema = z.object({
  number: z.number().int().positive(),
  season: z.number().int().positive(),
  title: z.string().optional().default(""),
});

const GatewayDetailSchema = z.object({
  title: GatewayTitleSchema,
  episodes: z.array(GatewayEpisodeSchema).optional().default([]),
  season: z.number().int().positive().optional().default(1),
});

const GatewayPlaybackSchema = z.object({
  status: z.enum([
    "ready",
    "authorization_required",
    "restricted",
    "unavailable",
    "unsupported",
  ]),
  message: z.string().optional().default(""),
  url: z.string().optional(),
  format: z.enum(["mp4", "hls"]).optional(),
  subtitles: z
    .array(
      z.object({
        url: z.string(),
        label: z.string(),
        language: z.string(),
      }),
    )
    .optional(),
});

const GATEWAY_TIMEOUT_MS = 8_000;
const GATEWAY_BACKOFF_MS = 60_000;

let gatewayUnavailableUntil = 0;

function gatewayBackoffActive(): boolean {
  return gatewayUnavailableUntil > Date.now();
}

function markGatewayUnavailable() {
  gatewayUnavailableUntil = Date.now() + GATEWAY_BACKOFF_MS;
}

function markGatewayHealthy() {
  gatewayUnavailableUntil = 0;
}

export function getCineplexGatewayBase(): URL | null {
  const raw = process.env.CINEPLEX_GATEWAY_URL?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.hash ||
      url.search
    ) {
      return null;
    }
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url;
  } catch {
    return null;
  }
}

export function hasCineplexGateway(): boolean {
  return getCineplexGatewayBase() !== null;
}

function resourceUrl(resource: string, params?: URLSearchParams): URL {
  const base = getCineplexGatewayBase();
  if (!base) throw new Error("Cineplex gateway is not configured");

  const url = new URL(base.origin);
  const prefix = base.pathname === "/" ? "" : base.pathname;
  url.pathname = `${prefix}/api/${resource}/`;
  if (params) url.search = params.toString();
  return url;
}

async function gatewayJson(
  resource: string,
  params?: URLSearchParams,
  timeoutMs = GATEWAY_TIMEOUT_MS,
  options: { bypassBackoff?: boolean } = {},
): Promise<unknown> {
  if (!options.bypassBackoff && gatewayBackoffActive()) {
    throw new Error("Cineplex gateway is temporarily unavailable");
  }

  try {
    const response = await fetch(resourceUrl(resource, params), {
      headers: {
        Accept: "application/json",
        "User-Agent": "PinFlix/1.0 Cineplex gateway client",
      },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      await response.body?.cancel();
      markGatewayUnavailable();
      throw new Error(
        `Cineplex gateway ${resource} returned HTTP ${response.status}`,
      );
    }

    const payload = await response.json();
    markGatewayHealthy();
    return payload;
  } catch (error) {
    markGatewayUnavailable();
    throw error;
  }
}

function safeArtwork(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function mapGatewayTitle(
  value: z.infer<typeof GatewayTitleSchema>,
): Entertainment {
  const kind = value.kind === "series" ? "show" : "movie";
  const id = `cb-${value.id}`;
  const rating =
    value.rating === null || value.rating === undefined
      ? undefined
      : Number(value.rating);
  const poster = safeArtwork(value.poster);
  const backdrop = safeArtwork(value.backdrop) || poster;

  return {
    id,
    slug: id,
    title: value.title,
    kind,
    provider: "cineplexbd",
    providerId: value.providerId,
    ...(value.year ? { year: value.year } : {}),
    ...(Number.isFinite(rating) ? { rating } : {}),
    genres: value.genres?.length
      ? value.genres
      : value.category
        ? [value.category]
        : [],
    backdrop,
    poster,
    synopsis: value.synopsis ?? "",
    ...(value.category ? { category: value.category } : {}),
    ...(value.country ? { country: value.country } : {}),
    ...(value.language ? { languages: [value.language] } : {}),
    ...(value.cast?.length
      ? { cast: value.cast.map((name) => ({ name })) }
      : {}),
  };
}

async function catalogue(
  kind: ProviderKind,
  page: number,
  options: { query?: string; category?: string } = {},
) {
  const params = new URLSearchParams({
    kind: kind === "show" ? "series" : "movie",
    page: String(Math.max(1, Math.floor(page))),
  });
  if (options.query) params.set("q", options.query);
  if (options.category) params.set("category", options.category);

  return GatewayCatalogueSchema.parse(await gatewayJson("catalogue", params));
}

export async function gatewaySearchPage(
  query: string,
  page = 1,
  kind: "all" | ProviderKind = "all",
): Promise<ProviderCatalogPage> {
  const normalized = query.trim();
  const safePage = Math.max(1, Math.floor(page));
  if (!normalized) {
    return { items: [], page: safePage, hasNextPage: false };
  }

  const kinds: ProviderKind[] =
    kind === "all" ? ["movie", "show"] : [kind];
  const results = await Promise.allSettled(
    kinds.map((candidate) =>
      catalogue(candidate, safePage, { query: normalized }),
    ),
  );

  const items = new Map<string, Entertainment>();
  let hasNextPage = false;
  let fulfilled = 0;

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    fulfilled += 1;

    // The EBN gateway can explicitly fall back to a dated snapshot. Do not
    // present that snapshot as a live Cineplex search source.
    if (result.value.stale || result.value.offlineMode) continue;

    hasNextPage ||= result.value.hasNext;
    for (const item of result.value.items) {
      const mapped = mapGatewayTitle(item);
      if (!items.has(mapped.id)) items.set(mapped.id, mapped);
    }
  }

  if (fulfilled === 0) {
    throw new Error("Cineplex gateway search is unavailable");
  }

  return {
    items: [...items.values()],
    page: safePage,
    hasNextPage,
  };
}

export async function gatewayLatestPage(
  kind: ProviderKind,
  page = 1,
): Promise<ProviderCatalogPage> {
  const safePage = Math.max(1, Math.floor(page));
  const result = await catalogue(kind, safePage);

  if (result.stale || result.offlineMode) {
    return { items: [], page: safePage, hasNextPage: false };
  }

  return {
    items: result.items.map(mapGatewayTitle),
    page: safePage,
    hasNextPage: result.hasNext,
  };
}

function categoryId(kind: ProviderKind, label: string): string {
  return `cineplex-gateway-${kind}-${encodeURIComponent(label)}`;
}

function decodeCategoryId(
  id: string,
): { kind: ProviderKind; label: string } | null {
  const match = id.match(/^cineplex-gateway-(movie|show)-(.+)$/);
  if (!match) return null;
  try {
    return {
      kind: match[1] as ProviderKind,
      label: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

export async function gatewayCategories(
  kind: ProviderKind,
): Promise<ProviderCategory[]> {
  const result = await catalogue(kind, 1);
  const expected = kind === "show" ? "series" : "movie";

  return result.categories
    .filter((category) => category.kind === expected && !category.mature)
    .map((category) => ({
      id: categoryId(kind, category.name),
      provider: "cineplexbd",
      label: category.name,
      group: "cineplex-gateway",
      kind,
      supportsPagination: true,
      supportedInPinflix: true,
    }));
}

export async function gatewayCategoryPage(
  id: string,
  page = 1,
): Promise<ProviderCatalogPage | null> {
  const decoded = decodeCategoryId(id);
  if (!decoded) return null;

  const safePage = Math.max(1, Math.floor(page));
  const result = await catalogue(decoded.kind, safePage, {
    category: decoded.label,
  });

  if (result.stale || result.offlineMode) {
    return { items: [], page: safePage, hasNextPage: false };
  }

  return {
    items: result.items.map(mapGatewayTitle),
    page: safePage,
    hasNextPage: result.hasNext,
  };
}

function gatewayProviderId(
  id: string,
): { id: string; kind: ProviderKind; rawId: string } | null {
  const match = id.match(/^cb-(movie|series)-(\d+)$/);
  if (!match) return null;

  return {
    id: `${match[1]}-${match[2]}`,
    kind: match[1] === "series" ? "show" : "movie",
    rawId: match[2],
  };
}

async function detailPayload(id: string, season = 1) {
  const parsed = gatewayProviderId(id);
  if (!parsed) return null;

  const params = new URLSearchParams({
    id: parsed.id,
    season: String(Math.max(1, Math.floor(season))),
  });

  return GatewayDetailSchema.parse(await gatewayJson("detail", params));
}

export async function gatewayDetails(
  id: string,
): Promise<Entertainment | null> {
  const payload = await detailPayload(id, 1);
  if (!payload) return null;

  const mapped = mapGatewayTitle(payload.title);
  return {
    ...mapped,
    id,
    slug: id,
    episodes:
      payload.title.kind === "series" ? payload.episodes.length : undefined,
  };
}

export async function gatewaySeriesNavigation(
  id: string,
  requestedSeason = 1,
): Promise<SeriesNavigation> {
  const season = Math.max(1, Math.floor(requestedSeason));
  const payload = await detailPayload(id, season);

  if (!payload) {
    return { seasons: [season], season, episodes: 1 };
  }

  const seasons = payload.title.seasons?.length
    ? payload.title.seasons
    : [payload.season || season];
  const selected = seasons.includes(season) ? season : seasons[0];

  return {
    seasons,
    season: selected,
    episodes: Math.max(1, payload.episodes.length),
    episodeNumbers: payload.episodes.map((episode) => episode.number),
  };
}

export function resolveGatewayStreamUrl(value: string): URL | null {
  const base = getCineplexGatewayBase();
  if (!base || !value || value.length > 8_192) return null;

  try {
    let url: URL;
    const prefix = base.pathname === "/" ? "" : base.pathname;

    if (/^https?:\/\//i.test(value)) {
      url = new URL(value);
    } else if (value.startsWith("/api/")) {
      url = new URL(base.origin);
      url.pathname = `${prefix}${value.split("?")[0]}`;
      const query = value.includes("?") ? value.slice(value.indexOf("?") + 1) : "";
      url.search = query;
    } else if (value.startsWith("/")) {
      url = new URL(value, base.origin);
    } else {
      const parent = new URL(base.toString() + "/");
      url = new URL(value, parent);
    }

    if (url.origin !== base.origin || url.username || url.password || url.hash) {
      return null;
    }

    const allowedPrefix = `${prefix}/api/stream/`.replace(/\/+/g, "/");
    if (!url.pathname.startsWith(allowedPrefix)) return null;
    return url;
  } catch {
    return null;
  }
}

function localProxyUrl(value: string): string {
  return `/api/proxy-cineplex-gateway?path=${encodeURIComponent(value)}`;
}

export async function gatewayStreams(
  id: string,
  options: { season?: number; episode?: number } = {},
): Promise<StreamSource[]> {
  const parsed = gatewayProviderId(id);
  if (!parsed) return [];

  const season = Math.max(1, Math.floor(options.season ?? 1));
  const episode = Math.max(1, Math.floor(options.episode ?? 1));
  const params = new URLSearchParams({
    id: parsed.id,
    season: String(season),
    episode: String(episode),
  });

  const playback = GatewayPlaybackSchema.parse(
    await gatewayJson("playback", params, 12_000),
  );

  if (
    playback.status !== "ready" ||
    !playback.url ||
    !playback.format ||
    !resolveGatewayStreamUrl(playback.url)
  ) {
    return [];
  }

  return [
    {
      url: localProxyUrl(playback.url),
      quality:
        playback.format === "hls"
          ? "Cineplex BDIX HLS"
          : "Cineplex BDIX source",
      protocol: playback.format === "hls" ? "hls" : "native",
      priority: 1,
      ...(playback.subtitles?.length
        ? {
            subtitles: playback.subtitles
              .filter((track) => resolveGatewayStreamUrl(track.url))
              .map((track) => ({
                label: track.label,
                language: track.language,
                url: localProxyUrl(track.url),
              })),
          }
        : {}),
    },
  ];
}

export async function probeCineplexGateway() {
  const base = getCineplexGatewayBase();
  if (!base) {
    return {
      configured: false,
      reachable: false,
      providerLive: false,
      status: null,
      latencyMs: 0,
      outcome: "not_configured",
    } as const;
  }

  const startedAt = Date.now();
  try {
    const params = new URLSearchParams({ kind: "movie", page: "1" });
    const result = GatewayCatalogueSchema.parse(
      await gatewayJson("catalogue", params, GATEWAY_TIMEOUT_MS, {
        bypassBackoff: true,
      }),
    );
    return {
      configured: true,
      reachable: true,
      providerLive: !result.stale && !result.offlineMode,
      status: 200,
      latencyMs: Date.now() - startedAt,
      outcome:
        !result.stale && !result.offlineMode ? "live" : "stale_snapshot",
      itemCount: result.items.length,
    } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    return {
      configured: true,
      reachable: false,
      providerLive: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      outcome:
        message.includes("timeout") || message.includes("aborted")
          ? "timeout"
          : "network_error",
    } as const;
  }
}
