import { load } from "cheerio";
import {
  PinFlixProvider,
  ProviderCatalogPage,
  ProviderCategory,
  SeriesNavigation,
  ProviderKind,
} from "../contracts";
import { Entertainment, StreamSource } from "@/src/types/catalog";

const BASE_URL = "http://cineplexbd.net";

const getProxiedImageUrl = (url?: string) => {
  if (!url) return "";
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}/${url.startsWith("/") ? url.slice(1) : url}`;
  return `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
};

export const cineplexbdProvider: PinFlixProvider = {
  name: "cineplexbd",

  canHandleId(id: string) {
    return id.startsWith("cb-");
  },

  async search(query: string, page = 1): Promise<Entertainment[]> {
    const url = `${BASE_URL}/search.php?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const html = await res.text();
    const $ = load(html);
    
    const items: Entertainment[] = [];
    $("a[href*='view.php?id=']").each((_, el) => {
      const href = $(el).attr("href");
      const match = href?.match(/id=(\d+)/);
      if (!match) return;
      const id = `cb-${match[1]}`;
      
      const title = $(el).find("p.text-sm.font-bold, h3, h2").text().trim() || "Unknown Title";
      const img = $(el).find("img").attr("src");
      const poster = getProxiedImageUrl(img);

      const yearText = $(el).find("span.text-gray-400").first().text().trim();
      const year = parseInt(yearText, 10) || undefined;
      
      // Determine kind based on URL or title
      // Usually cineplexbd has Series in the title or category
      const kindText = $(el).text().toLowerCase();
      const kind = (kindText.includes("series") || kindText.includes("season") || kindText.includes("episode")) ? "show" : "movie";
      
      items.push({
        id,
        slug: id,
        title,
        kind,
        year,
        poster,
        backdrop: poster,
        genres: [],
        synopsis: "From CineplexBD",
      });
    });
    
    return items.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
  },

  async getLatestPage(kind: ProviderKind, page = 1): Promise<ProviderCatalogPage> {
    const url = `${BASE_URL}/category.php?page=${page}`;
    const res = await fetch(url);
    const html = await res.text();
    const $ = load(html);
    
    const items: Entertainment[] = [];
    $("a[href*='view.php?id=']").each((_, el) => {
      const href = $(el).attr("href");
      const match = href?.match(/id=(\d+)/);
      if (!match) return;
      const id = `cb-${match[1]}`;
      
      const title = $(el).find("p.text-sm.font-bold, h3, h2").text().trim() || "Unknown Title";
      const img = $(el).find("img").attr("src");
      const poster = getProxiedImageUrl(img);

      const yearText = $(el).find("span.text-gray-400").first().text().trim();
      const year = parseInt(yearText, 10) || undefined;
      
      const kindText = $(el).text().toLowerCase();
      const kind = (kindText.includes("series") || kindText.includes("season") || kindText.includes("episode")) ? "show" : "movie";
      
      items.push({
        id,
        slug: id,
        title,
        kind,
        year,
        poster,
        backdrop: poster,
        genres: [],
        synopsis: "From CineplexBD",
      });
    });
    
    const uniqueItems = items.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
    return {
      items: uniqueItems,
      page,
      hasNextPage: uniqueItems.length > 0,
    };
  },

  async getCategories(kind: ProviderKind): Promise<ProviderCategory[]> {
    return [
      { id: "cb-action", provider: "cineplexbd", label: "Action", group: "Genre", kind: "movie", supportsPagination: true, supportedInPinflix: true },
      { id: "cb-comedy", provider: "cineplexbd", label: "Comedy", group: "Genre", kind: "movie", supportsPagination: true, supportedInPinflix: true },
    ];
  },

  async getCategoryPage(categoryId: string, page = 1): Promise<ProviderCatalogPage> {
    return this.getLatestPage("movie", page);
  },

  async getDetails(id: string): Promise<Entertainment | null> {
    const rawId = id.replace("cb-", "");
    const url = `${BASE_URL}/view.php?id=${rawId}`;
    const res = await fetch(url);
    const html = await res.text();
    const $ = load(html);
    
    const title = $("h1").first().text().trim() || "CineplexBD Content";
    
    const img = $("img[src*='uploads/'], img[src*='tmdb.org']").first().attr("src");
    const poster = getProxiedImageUrl(img);
    
    return {
      id,
      slug: id,
      title,
      kind: "movie",
      poster,
      backdrop: poster,
      genres: [],
      synopsis: "Playing from CineplexBD BDIX Server",
    };
  },

  async getSeriesNavigation(id: string, requestedSeason = 1): Promise<SeriesNavigation> {
    return {
      seasons: [1],
      season: 1,
      episodes: 1,
    };
  },

  async resolveStreams(id: string, options = {}): Promise<StreamSource[]> {
    const rawId = id.replace("cb-", "");
    
    const viewRes = await fetch(`${BASE_URL}/view.php?id=${rawId}`);
    const viewHtml = await viewRes.text();
    const playerMatch = viewHtml.match(/player\.php\?id=(\d+)/i);
    const playerId = playerMatch ? playerMatch[1] : rawId;
    
    const playerUrl = `${BASE_URL}/player.php?id=${playerId}`;
    const res = await fetch(playerUrl);
    const html = await res.text();
    
    const srcMatch = html.match(/videoSrc\s*=\s*["']([^"']+)["']/i) || html.match(/<source[^>]+src=["']([^"']+)["']/i);
    if (!srcMatch) return [];
    
    let videoUrl = srcMatch[1];
    if (!videoUrl.startsWith("http")) {
      videoUrl = `${BASE_URL}${videoUrl.startsWith("/") ? "" : "/"}${videoUrl}`;
    }

    // Proxy the video URL to avoid Mixed Content errors on HTTPS
    const proxiedVideoUrl = `/api/proxy-video?url=${encodeURIComponent(videoUrl)}`;
    
    return [{
      url: proxiedVideoUrl,
      quality: "1080p",
      protocol: videoUrl.includes(".m3u8") ? "hls" : "native",
      priority: 1,
    }];
  },
};
