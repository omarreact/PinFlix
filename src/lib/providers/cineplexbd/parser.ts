import * as cheerio from "cheerio";
import type { Entertainment } from "@/src/types/catalog";
import { CINEPLEX_BASE_URL } from "./api";

type CatalogContext = {
  forcedKind?: "movie" | "show";
  category?: string;
};

function cleanUrl(url: string) {
  if (url.startsWith("http")) return url;
  return `${CINEPLEX_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function extractNumericId(href: string) {
  try {
    const url = new URL(href, CINEPLEX_BASE_URL);
    return url.searchParams.get("series_id") || url.searchParams.get("id") || "";
  } catch {
    return "";
  }
}

function inferKind(href: string, forcedKind?: "movie" | "show"): "movie" | "show" {
  if (forcedKind) return forcedKind;
  if (href.includes("series_id=") || href.includes("tview.php")) return "show";
  return "movie";
}

function providerId(kind: "movie" | "show", rawId: string) {
  return `cb-${kind === "show" ? "series" : "movie"}-${rawId}`;
}

function findYear(text: string) {
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : undefined;
}

function findRating(text: string) {
  const match = text.match(/(?:★|rating|score)\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i);
  return match ? Number(match[1]) : undefined;
}

export function parseCatalog(html: string, context: CatalogContext = {}): Entertainment[] {
  const $ = cheerio.load(html);
  const items: Entertainment[] = [];
  const seen = new Set<string>();

  const selectors =
    "a[href*='view.php'], a[href*='watch.php'], a[href*='tview.php'], .movie-card a, a:has(.poster), a:has(img[src*='uploads'])";

  $(selectors).each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr("href")?.trim();
    if (!href) return;

    const rawId = extractNumericId(href);
    if (!rawId) return;

    const kind = inferKind(href, context.forcedKind);
    const id = providerId(kind, rawId);
    if (seen.has(id)) return;

    const titleElement = anchor
      .find(".truncate, div.text-sm, div.cp-title, h2, .card-title, .title")
      .first();
    const posterElement = anchor
      .find("img.poster, .tvCard img, img[class*='poster'], img[src*='uploads/']")
      .first();
    const fallbackImage = anchor.find("img").first();

    const title =
      titleElement.text().trim() ||
      posterElement.attr("alt")?.trim() ||
      fallbackImage.attr("alt")?.trim() ||
      "";

    if (!title) return;

    const text = anchor.text().replace(/\s+/g, " ").trim();
    const genreText = anchor.find("p").first().text().trim();
    let rawImage =
      posterElement.attr("data-src") ||
      posterElement.attr("src") ||
      fallbackImage.attr("data-src") ||
      fallbackImage.attr("src");

    if (!rawImage) {
      const style = anchor.find("div[style*='background-image']").attr("style");
      const match = style?.match(/url\((['"]?)(.*?)\1\)/i);
      rawImage = match?.[2];
    }

    const poster = rawImage ? cleanUrl(rawImage) : "";
    const year = findYear(text);
    const rating = findRating(text);

    seen.add(id);
    items.push({
      id,
      slug: id,
      provider: "cineplexbd",
      providerId: rawId,
      detailUrl: new URL(href, CINEPLEX_BASE_URL).pathname + new URL(href, CINEPLEX_BASE_URL).search,
      category: context.category,
      title,
      kind,
      ...(year !== undefined ? { year } : {}),
      ...(rating !== undefined ? { rating } : {}),
      genres: genreText ? [genreText] : [],
      backdrop: poster,
      poster,
      synopsis: "",
    });
  });

  return items;
}

export function parseHasNextPage(html: string) {
  const $ = cheerio.load(html);
  return $("ul.pagination li.active + li a, a:contains(Next), a:contains(»), a.next").length > 0;
}

export function parseDetails(
  html: string,
  urlPath: string,
  metaJson?: unknown,
): Partial<Entertainment> {
  const $ = cheerio.load(html);
  const meta = asObject(metaJson);

  const title = $("h1, .movie-title, title")
    .first()
    .text()
    .replace(" — Watch", "")
    .trim();

  let synopsis = $("p.leading-relaxed, #synopsis, .description").first().text().trim();
  if (typeof meta?.synopsis === "string" && meta.synopsis.trim()) synopsis = meta.synopsis.trim();

  let genreText = $("span.chip:contains(,)").text().trim();
  if (!genreText) {
    const values: string[] = [];
    $("div.ganre-wrapper a, .meta-cat, .genre a").each((_, element) => {
      const value = $(element).text().trim();
      if (value) values.push(value);
    });
    genreText = values.join(", ");
  }

  const detailsImage = $("img.poster, .tvCard img, .movie-poster img").first();
  const rawImage = detailsImage.attr("data-src") || detailsImage.attr("src");
  const poster = rawImage ? cleanUrl(rawImage) : "";

  const yearText = $("span.chip")
    .filter((_, element) => /^\d{4}$/.test($(element).text().trim()))
    .first()
    .text()
    .trim();
  const year = /^\d{4}$/.test(yearText) ? Number(yearText) : undefined;

  let rating: number | undefined;
  if (typeof meta?.rating === "string" || typeof meta?.rating === "number") {
    const parsed = Number(meta.rating);
    if (Number.isFinite(parsed)) rating = parsed;
  }
  if (rating === undefined) {
    const scoreText =
      $(".pill:contains(★)").first().text().trim() ||
      $("span.pill:contains(User Score:)").first().text().trim();
    rating = findRating(scoreText);
  }

  let episodes: number | undefined;
  if (urlPath.includes("watch.php") || urlPath.includes("series_id=") || urlPath.includes("tview.php")) {
    const metaEpisodes = asObject(meta?.episodes);
    episodes = metaEpisodes ? Object.keys(metaEpisodes).length : $("a.ep-card").length || undefined;
  }

  return {
    ...(title ? { title } : {}),
    ...(synopsis ? { synopsis } : {}),
    genres: genreText.split(",").map((value) => value.trim()).filter(Boolean),
    ...(poster ? { poster, backdrop: poster } : {}),
    ...(year !== undefined ? { year } : {}),
    ...(rating !== undefined ? { rating } : {}),
    ...(episodes !== undefined ? { episodes } : {}),
  };
}

export function parsePlayerUrl(html: string): string | null {
  const videoSrcMatch = html.match(/const videoSrc\s*=\s*['"]([^'"]+)['"]/);
  if (videoSrcMatch?.[1]) return cleanUrl(videoSrcMatch[1]);

  const $ = cheerio.load(html);
  const sourceUrl = $("source[type='video/mp4'], source[type='application/x-mpegURL'], source")
    .first()
    .attr("src");

  return sourceUrl ? cleanUrl(sourceUrl) : null;
}
