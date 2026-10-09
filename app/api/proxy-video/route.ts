import { NextRequest } from "next/server";
import { rewriteManifest } from "@/src/lib/media-manifest";
import { toWebVtt } from "@/src/lib/subtitles";
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

async function proxy(req: NextRequest, method: "GET" | "HEAD") {
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetchCineplexOrigin(upstreamUrl, {
      method,
      headers,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.any([controller.signal, req.signal]),
    });

    clearTimeout(timeout);
    if (response.status === 416) {
      return new Response(null, { status: 416, headers: { "Content-Range": response.headers.get("content-range") ?? "bytes */*", "Cache-Control": "no-store" } });
    }
    if (!response.ok || (method !== "HEAD" && !response.body)) {
      return new Response("CineplexBD media unavailable", {
        status: response.status || 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const contentType = response.headers.get("content-type") || "";
    const isManifest =
      /\.m3u8(?:$|[?#])/i.test(upstreamUrl.pathname) ||
      /mpegurl|m3u8/i.test(contentType);

    if (method !== "HEAD" && /\.(srt|vtt)$/i.test(upstreamUrl.pathname)) {
      return new Response(toWebVtt(await response.text()), { headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "private, no-store" } });
    }
    if (method !== "HEAD" && isManifest) {
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

    return new Response(method === "HEAD" ? null : response.body, {
      status: response.status,
      headers: outgoing,
    });
  } catch (error) {
    clearTimeout(timeout);
    console.error("CineplexBD media proxy error:", error);
    return new Response("CineplexBD media proxy unavailable", { status: 502 });
  }
}

export async function GET(req: NextRequest) { return proxy(req, "GET"); }
export async function HEAD(req: NextRequest) { return proxy(req, "HEAD"); }
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { "Allow": "GET, HEAD, OPTIONS", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS", "Access-Control-Allow-Headers": "Range, If-Range" } });
}
