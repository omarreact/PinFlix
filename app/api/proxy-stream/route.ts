import { catalogProvider } from "@/src/lib/providers/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MEDIA_HOST_SUFFIXES = ["aoneroom.com", "hakunaymatata.com"];
const STREAM_TIMEOUT_MS = 30_000;

function positiveInteger(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 10_000 ? parsed : undefined;
}

function isAllowedMediaUrl(url: URL) {
  const host = url.hostname.toLowerCase();
  return (
    url.protocol === "https:" &&
    ALLOWED_MEDIA_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
  );
}

function playerReferer(id: string, season: number, episode: number) {
  const [, subjectId, detailPath] = id.match(/^mb-(\d+)~(.+)$/) ?? [];
  if (!subjectId || !detailPath) return null;

  const url = new URL(`/movies/${detailPath}`, "https://movibox.net");
  url.searchParams.set("id", subjectId);
  url.searchParams.set("type", "/movie/detail");
  url.searchParams.set("detailSe", season > 0 ? String(season) : "");
  url.searchParams.set("detailEp", episode > 0 ? String(episode) : "");
  url.searchParams.set("lang", "en");
  return url.toString();
}

function proxiedUrl(mediaUrl: URL, id: string, season: number, episode: number) {
  const params = new URLSearchParams({
    id,
    url: mediaUrl.toString(),
    season: String(season),
    episode: String(episode),
  });
  return `/api/proxy-stream?${params.toString()}`;
}

function rewriteManifest(manifest: string, baseUrl: URL, id: string, season: number, episode: number) {
  return manifest
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
          const absolute = new URL(uri, baseUrl);
          return `URI="${proxiedUrl(absolute, id, season, episode)}"`;
        });
      }

      const absolute = new URL(trimmed, baseUrl);
      return proxiedUrl(absolute, id, season, episode);
    })
    .join("\n");
}

async function proxyStream(request: Request, method: "GET" | "HEAD") {
  const requestUrl = new URL(request.url);
  const id = requestUrl.searchParams.get("id")?.trim() ?? "";
  const rawMediaUrl = requestUrl.searchParams.get("url") ?? "";

  if (!catalogProvider.canHandleId(id)) {
    return new Response("Unsupported provider title ID", { status: 400 });
  }

  let mediaUrl: URL;
  try {
    mediaUrl = new URL(rawMediaUrl);
  } catch {
    return new Response("Invalid media URL", { status: 400 });
  }

  if (!isAllowedMediaUrl(mediaUrl)) {
    return new Response("Media host is not allowed", { status: 403 });
  }

  const season = positiveInteger(requestUrl.searchParams.get("season")) ?? 0;
  const episode = positiveInteger(requestUrl.searchParams.get("episode")) ?? 0;
  const referer = playerReferer(id, season, episode);
  if (!referer) return new Response("Invalid provider title ID", { status: 400 });

  const headers = new Headers({
    Accept: request.headers.get("accept") ?? "*/*",
    Origin: "https://movibox.net",
    Referer: referer,
    "User-Agent": request.headers.get("user-agent") ?? "Mozilla/5.0",
  });

  for (const name of ["range", "if-range"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(mediaUrl, {
      method,
      headers,
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const contentType = upstream.headers.get("content-type") ?? "";
    const isManifest =
      /mpegurl|vnd\.apple\.mpegurl|x-mpegurl/i.test(contentType) || /\.m3u8(?:$|[?#])/i.test(mediaUrl.href);

    if (method === "GET" && isManifest) {
      const text = await upstream.text();
      return new Response(rewriteManifest(text, mediaUrl, id, season, episode), {
        status: upstream.status,
        headers: {
          "Cache-Control": "private, no-store, no-cache, max-age=0",
          "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const outgoing = new Headers({
      "Cache-Control": "private, no-store, no-cache, max-age=0",
      "X-Content-Type-Options": "nosniff",
    });

    for (const name of [
      "accept-ranges",
      "content-length",
      "content-range",
      "content-type",
      "etag",
      "last-modified",
    ]) {
      const value = upstream.headers.get(name);
      if (value) outgoing.set(name, value);
    }

    return new Response(method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers: outgoing,
    });
  } catch (error) {
    clearTimeout(timeout);
    console.error("MovieBox stream proxy error:", error);
    return new Response("MovieBox stream is temporarily unavailable", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function GET(request: Request) {
  return proxyStream(request, "GET");
}

export async function HEAD(request: Request) {
  return proxyStream(request, "HEAD");
}
