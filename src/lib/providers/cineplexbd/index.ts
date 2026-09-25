import type { Entertainment, StreamSource } from "@/src/types/catalog";
import { fetchHtml, fetchJson } from "./api";
import { parseCatalog, parseDetails, parsePlayerUrl } from "./parser";

function transformVodUrl(url: string): string {
  if (url.includes("vod.cineplexbd.net:8081")) {
    return url
      .replace("http://vod.cineplexbd.net:8081/tv-series/", "/hls/t/")
      .replace("http://vod.cineplexbd.net:8081/movies/", "/hls/m/")
      .replace("http://vod.cineplexbd.net:8081/", "/hls/")
      .replace("/index.m3u8", "/master.m3u8");
  }
  return url;
}

export async function search(query: string): Promise<Entertainment[]> {
  try {
    const url = `/search.php?q=${encodeURIComponent(query)}&page=1`;
    const html = await fetchHtml(url);
    return parseCatalog(html);
  } catch (error) {
    console.error("CineplexBD search error:", error);
    return [];
  }
}

export async function getLatest(): Promise<Entertainment[]> {
  try {
    const html = await fetchHtml("/search.php?q=&page=1");
    return parseCatalog(html);
  } catch (error) {
    console.error("CineplexBD getLatest error:", error);
    return [];
  }
}

export async function getDetails(id: string): Promise<Entertainment | null> {
  try {
    // id comes in as "cb-XXXXX" or "cb-series-XXXXX"
    const rawId = id.replace(/^cb-/, "");
    // Just guess watch.php?id= for movies and series
    const isSeries = false; // We can improve this if we have a way to know, but let's try player.php
    
    // For details, view.php?id= or tview.php?id= are best. 
    // The Kotlin extension uses `url` stored on the item, but we only have ID.
    // Let's try `view.php` and fallback to `watch.php`.
    const url = `/view.php?id=${rawId}`;
    const html = await fetchHtml(url);
    
    // Try to get metaJson too
    let metaJson: any = null;
    try {
      metaJson = await fetchJson(`/watch.php?id=${rawId}&season=1&meta=1`);
    } catch (e) {
      // Ignored
    }

    const partial = parseDetails(html, url, metaJson);
    
    return {
      id,
      slug: id,
      title: partial.title || "Unknown Title",
      kind: partial.episodes ? "show" : "movie",
      year: partial.year || new Date().getFullYear(),
      rating: partial.rating || 0,
      genres: partial.genres || [],
      backdrop: partial.backdrop || "",
      poster: partial.poster || "",
      synopsis: partial.synopsis || "",
      ...(partial.episodes ? { episodes: partial.episodes } : {})
    };
  } catch (error) {
    console.error("CineplexBD getDetails error:", error);
    return null;
  }
}

export async function resolveStreams(id: string): Promise<StreamSource[]> {
  try {
    const rawId = id.replace(/^cb-/, "");
    const playerUrl = `/player.php?id=${rawId}`;
    const html = await fetchHtml(playerUrl);
    
    let videoUrl = parsePlayerUrl(html);
    if (!videoUrl) return [];

    // The Kotlin app does `transformVodUrl` but only if it matches `vod.cineplexbd.net:8081`.
    // We found during our test that sometimes `videoSrc` is relative like `/v/m/...`.
    // In those cases, the raw playback proxy handles standard HTTP(S).
    
    const streams: StreamSource[] = [];
    
    if (videoUrl.includes("vod.cineplexbd.net:8081")) {
      // Create both routes for testing as requested by user
      const transformedUrl = "http://cineplexbd.net" + transformVodUrl(videoUrl).replace("http://vod.cineplexbd.net:8081", "");
      
      streams.push({
        url: transformedUrl,
        quality: "1080p (Transformed)",
        protocol: "hls",
        priority: 1
      });
      
      streams.push({
        url: videoUrl,
        quality: "1080p (Raw VOD)",
        protocol: "hls",
        priority: 2
      });
    } else {
      // Direct MP4 or unknown HLS
      const isHls = videoUrl.includes(".m3u8");
      
      // If it's a relative URL to cineplexbd.net, we should make it absolute
      if (videoUrl.startsWith("/")) {
        videoUrl = `http://cineplexbd.net${videoUrl}`;
      }

      streams.push({
        url: videoUrl,
        quality: isHls ? "Auto (HLS)" : "Source (MP4)",
        protocol: isHls ? "hls" : "native",
        priority: 1
      });
    }

    return streams;
  } catch (error) {
    console.error("CineplexBD resolveStreams error:", error);
    return [];
  }
}
