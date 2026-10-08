import { catalogProvider } from "@/src/lib/providers/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MEDIA_HOSTS = new Set([
  "bcdnxw.hakunaymatata.com",
  "cacdn.hakunaymatata.com",
  "macdn.aoneroom.com",
  "pacdn.aoneroom.com",
  "pbcdn.aoneroom.com",
  "pbcdnw.aoneroom.com",
  "sbcdnw.hakunaymatata.com",
]);

function positiveInteger(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 10_000
    ? parsed
    : undefined;
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

  if (
    mediaUrl.protocol !== "https:" ||
    !ALLOWED_MEDIA_HOSTS.has(mediaUrl.hostname.toLowerCase()) ||
    !/\.mp4$/i.test(mediaUrl.pathname)
  ) {
    return new Response("Media host or format is not allowed", { status: 403 });
  }

  const season = positiveInteger(requestUrl.searchParams.get("season")) ?? 0;
  const episode = positiveInteger(requestUrl.searchParams.get("episode")) ?? 0;
  const referer = playerReferer(id, season, episode);
  if (!referer) return new Response("Invalid provider title ID", { status: 400 });

  const headers = new Headers({
    Accept: request.headers.get("accept") ?? "*/*",
    Referer: referer,
    "User-Agent": request.headers.get("user-agent") ?? "Mozilla/5.0",
  });

  for (const name of ["range", "if-range"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(mediaUrl, {
      method,
      headers,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });

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
