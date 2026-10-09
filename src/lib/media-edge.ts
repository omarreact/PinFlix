import type { StreamSource } from "@/src/types/catalog";

const DEFAULT_MEDIA_EDGE_API_BASE = "https://pinflix-media-api.farukkhanone.workers.dev";
const MEDIA_EDGE_TIMEOUT_MS = 6_000;

type MediaEdgeResolveResponse = {
  sources?: Array<{
    label?: unknown;
    url?: unknown;
  }>;
  error?: unknown;
};

export function mediaEdgeApiBase() {
  const configured =
    process.env.PINFLIX_MEDIA_API_URL ||
    process.env.NEXT_PUBLIC_PINFLIX_MEDIA_API ||
    DEFAULT_MEDIA_EDGE_API_BASE;

  try {
    const url = new URL(configured);
    if (url.protocol !== "https:") return new URL(DEFAULT_MEDIA_EDGE_API_BASE);
    url.pathname = url.pathname.replace(/\/$/, "");
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return new URL(DEFAULT_MEDIA_EDGE_API_BASE);
  }
}

function movieboxSubjectId(id: string) {
  return id.match(/^mb-(\d+)~.+$/)?.[1] ?? null;
}

export function mediaEdgeCatalogKey(
  id: string,
  options: { season?: number; episode?: number } = {},
) {
  const subjectId = movieboxSubjectId(id);
  if (!subjectId) return null;

  const season = Number.isInteger(options.season) && Number(options.season) > 0 ? Number(options.season) : 0;
  const episode = Number.isInteger(options.episode) && Number(options.episode) > 0 ? Number(options.episode) : 0;

  if (season > 0 || episode > 0) {
    return `tv:${subjectId}:s${season || 1}e${episode || 1}`;
  }

  return `movie:${subjectId}`;
}

export function isMediaEdgeUrl(rawUrl: string) {
  try {
    const base = mediaEdgeApiBase();
    const url = new URL(rawUrl);
    return url.protocol === "https:" && url.hostname === base.hostname;
  } catch {
    return false;
  }
}

function protocolFromUrl(rawUrl: string): StreamSource["protocol"] {
  try {
    const url = new URL(rawUrl);
    return /\.m3u8(?:$|[?#])/i.test(url.pathname) ? "hls" : "native";
  } catch {
    return "native";
  }
}

export async function resolveMediaEdgeStreams(
  id: string,
  options: { season?: number; episode?: number } = {},
): Promise<StreamSource[]> {
  const key = mediaEdgeCatalogKey(id, options);
  if (!key) return [];

  const base = mediaEdgeApiBase();
  const url = new URL("/public-resolve", base);
  url.searchParams.set("key", key);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MEDIA_EDGE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`PinFlix media edge returned HTTP ${response.status} for ${key}`);
      return [];
    }

    const result = (await response.json()) as MediaEdgeResolveResponse;
    if (!Array.isArray(result.sources)) return [];

    return result.sources
      .map((source, index) => {
        if (typeof source.url !== "string" || !isMediaEdgeUrl(source.url)) return null;
        const label = typeof source.label === "string" && source.label.trim() ? source.label.trim() : "Cloudflare Edge";

        return {
          url: source.url,
          quality: `Cloudflare Edge · ${label}`,
          protocol: protocolFromUrl(source.url),
          priority: 10_000 - index,
        } satisfies StreamSource;
      })
      .filter((source): source is StreamSource => source !== null);
  } catch (error) {
    console.warn("PinFlix media edge unavailable:", error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function getMediaEdgeHealth() {
  const base = mediaEdgeApiBase();
  const url = new URL("/health", base);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MEDIA_EDGE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      baseUrl: base.toString().replace(/\/$/, ""),
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      baseUrl: base.toString().replace(/\/$/, ""),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
