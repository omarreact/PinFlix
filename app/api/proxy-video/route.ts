import { NextRequest } from "next/server";
import {
  fetchCineplexOrigin,
  isAllowedCineplexUrl,
} from "@/src/lib/cineplex-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function transformVodUrl(url: URL) {
  if (url.hostname.toLowerCase() !== "vod.cineplexbd.net") return url;

  const pathname = url.pathname;
  let mappedPath: string | null = null;

  if (pathname.startsWith("/tv-series/")) {
    mappedPath = "/hls/t/" + pathname.slice("/tv-series/".length);
  } else if (pathname.startsWith("/movies/")) {
    mappedPath = "/hls/m/" + pathname.slice("/movies/".length);
  }

  if (!mappedPath) return url;

  mappedPath = mappedPath.replace(/\/index\.m3u8$/i, "/master.m3u8");

  const mapped = new URL("http://cineplexbd.net");
  mapped.pathname = mappedPath;
  mapped.search = url.search;
  return mapped;
}

function toProxyUrl(url: string) {
  return `/api/proxy-video?url=${encodeURIComponent(url)}`;
}

function resolveUri(baseUrl: string, value: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function rewriteManifest(manifest: string, manifestUrl: string) {
  return manifest
    .split(/\r?\n/)
    .map((line) => {
      if (!line) return line;

      if (line.startsWith("#")) {
        return line.replace(
          /(URI\s*=\s*)(["']?)([^"',\s]+)\2/gi,
          (_match, prefix: string, quote: string, target: string) => {
            const resolved = resolveUri(manifestUrl, target);
            return `${prefix}${quote}${toProxyUrl(resolved)}${quote}`;
          },
        );
      }

      return toProxyUrl(resolveUri(manifestUrl, line.trim()));
    })
    .join("\n");
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) return new Response("Missing url parameter", { status: 400 });

  let upstreamUrl: URL;
  try {
    upstreamUrl = transformVodUrl(new URL(rawUrl));
  } catch {
    return new Response("Invalid media URL", { status: 400 });
  }

  if (!isAllowedCineplexUrl(upstreamUrl)) {
    return new Response("Media host is not allowed", { status: 403 });
  }

  const headers = new Headers({
    Accept:
      req.headers.get("accept") ||
      "application/vnd.apple.mpegurl,application/x-mpegURL,video/mp2t,video/mp4,*/*",
    Referer: "http://cineplexbd.net/",
    "User-Agent": req.headers.get("user-agent") || "Mozilla/5.0",
  });

  const range = req.headers.get("range");
  if (range && !/\.m3u8(?:$|[?#])/i.test(upstreamUrl.pathname)) {
    headers.set("Range", range);
  }

  try {
    const response = await fetchCineplexOrigin(upstreamUrl, {
      method: req.method,
      headers,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok || !response.body) {
      return new Response("CineplexBD media unavailable", {
        status: response.status || 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const contentType = response.headers.get("content-type") || "";
    const isManifest =
      /\.m3u8(?:$|[?#])/i.test(upstreamUrl.pathname) ||
      /mpegurl|m3u8/i.test(contentType);

    if (isManifest) {
      const text = await response.text();
      return new Response(rewriteManifest(text, upstreamUrl.toString()), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "private, no-store",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const outgoing = new Headers({
      "Content-Type": contentType || "application/octet-stream",
      "Cache-Control": "private, no-store",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    });

    for (const name of ["content-length", "content-range", "accept-ranges"]) {
      const value = response.headers.get(name);
      if (value) outgoing.set(name, value);
    }

    return new Response(response.body, {
      status: response.status,
      headers: outgoing,
    });
  } catch (error) {
    console.error("CineplexBD media proxy error:", error);
    return new Response("CineplexBD media proxy unavailable", { status: 502 });
  }
}
