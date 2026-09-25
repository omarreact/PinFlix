import * as cheerio from "cheerio";
import type { Entertainment } from "@/src/types/catalog";

const BASE_URL = "http://cineplexbd.net";

function cleanUrl(url: string) {
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export function parseCatalog(html: string): Entertainment[] {
  const $ = cheerio.load(html);
  const items: Entertainment[] = [];
  
  const selectors = "a[href*='view.php'], a[href*='watch.php'], a[href*='tview.php'], .movie-card a, a:has(.poster), a:has(img[src*='uploads'])";
  
  $(selectors).each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href");
    if (!href) return;
    
    let idStr = "";
    let kind: "movie" | "show" = "movie";
    
    if (href.includes("series_id=")) {
      idStr = new URLSearchParams(href.split("?")[1]).get("series_id") || "";
      kind = "show";
    } else if (href.includes("tview.php")) {
      idStr = new URLSearchParams(href.split("?")[1]).get("id") || "";
      kind = "show";
    } else {
      idStr = new URLSearchParams(href.split("?")[1]).get("id") || "";
    }
    
    if (!idStr) return;
    
    const titleEl = $el.find(".truncate, div.text-sm, div.cp-title, h2, .card-title, .title").first();
    const posterEl = $el.find("img.poster, .tvCard img, img[class*='poster'], img[src*='uploads/']").first();
    const fallbackImg = $el.find("img").first();
    
    const title = titleEl.text().trim() || posterEl.attr("alt") || "Unknown Title";
    if (title === "Unknown Title") return;
    
    const genreStr = $el.find("p").first().text().trim();
    let rawImg = posterEl.attr("data-src") || posterEl.attr("src") || fallbackImg.attr("data-src") || fallbackImg.attr("src");
    
    if (!rawImg) {
      const style = $el.find("div[style*='background-image']").attr("style");
      if (style && style.includes("url(")) {
        rawImg = style.split("url(")[1].split(")")[0].replace(/['"]/g, "");
      }
    }
    
    const posterUrl = rawImg ? cleanUrl(rawImg) : "";
    
    // Check if we already have this id to prevent duplicates
    if (!items.find(item => item.id === `cb-${idStr}`)) {
      items.push({
        id: `cb-${idStr}`,
        slug: `cb-${idStr}`,
        title,
        kind,
        year: new Date().getFullYear(), // Fallback, details fetch will refine
        rating: 0, 
        genres: genreStr ? [genreStr] : [],
        backdrop: posterUrl,
        poster: posterUrl,
        synopsis: "",
      });
    }
  });
  
  return items;
}

export function parseDetails(html: string, urlPath: string, metaJson?: any): Partial<Entertainment> {
  const $ = cheerio.load(html);
  
  let title = $("h1, .movie-title, title").first().text().replace(" — Watch", "").trim();
  let synopsis = $("p.leading-relaxed, #synopsis, .description").first().text().trim();
  
  let genreStr = $("span.chip:contains(,)").text().trim();
  if (!genreStr) {
    const genres: string[] = [];
    $("div.ganre-wrapper a, .meta-cat, .genre a").each((_, el) => {
      genres.push($(el).text().trim());
    });
    genreStr = genres.join(", ");
  }
  const genres = genreStr.split(",").map(g => g.trim()).filter(Boolean);
  
  const detailsImg = $("img.poster, .tvCard img, .movie-poster img").first();
  const rawDetailsImg = detailsImg.attr("data-src") || detailsImg.attr("src");
  const posterUrl = rawDetailsImg ? cleanUrl(rawDetailsImg) : "";
  
  const yearStr = $("span.chip").filter((_, el) => /^\d{4}$/.test($(el).text().trim())).text().trim();
  const year = parseInt(yearStr) || new Date().getFullYear();
  
  const ratingScore = $("span.pill:contains(User Score:)").text().trim();
  const starScore = $(".pill:contains(★)").first().text().trim();
  let rating = 0;
  
  if (metaJson?.rating) {
    rating = parseFloat(metaJson.rating) || 0;
  } else if (starScore) {
    const match = starScore.match(/([\d.]+)/);
    if (match) rating = parseFloat(match[1]);
  } else if (ratingScore) {
    const match = ratingScore.match(/([\d.]+)/);
    if (match) rating = parseFloat(match[1]);
  }
  
  if (metaJson?.synopsis) synopsis = metaJson.synopsis;
  
  let episodesCount: number | undefined;
  if (urlPath.includes("watch.php") || urlPath.includes("series_id=")) {
    // If it's a TV show, count the episodes in metaJson if available
    if (metaJson?.episodes) {
      episodesCount = Object.keys(metaJson.episodes).length;
    } else {
      episodesCount = $("a.ep-card").length || undefined;
    }
  }

  return {
    title,
    synopsis,
    genres,
    poster: posterUrl,
    backdrop: posterUrl, // They often use the poster as backdrop
    year,
    rating,
    ...(episodesCount !== undefined ? { episodes: episodesCount } : {})
  };
}

export function parsePlayerUrl(html: string): string | null {
  const videoSrcMatch = html.match(/const videoSrc\s*=\s*['"]([^'"]+)['"]/);
  if (videoSrcMatch && videoSrcMatch[1]) {
    return cleanUrl(videoSrcMatch[1]);
  }
  const $ = cheerio.load(html);
  const sourceUrl = $("source[type='video/mp4'], source[type='application/x-mpegURL'], source").first().attr("src");
  if (sourceUrl) return cleanUrl(sourceUrl);
  return null;
}
