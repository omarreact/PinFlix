import "server-only";

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { Entertainment } from "@/src/types/catalog";
import type { ProviderCategory } from "../contracts";

const SITE_BASE = "https://movie-box.co";
const PUBLIC_TIMEOUT_MS = 7_000;

const GENRES = [
  "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime",
  "Documentary", "Drama", "Family", "Fantasy", "Film-Noir", "Game-Show",
  "History", "Horror", "Music", "Musical", "Mystery", "News",
  "Reality-TV", "Romance", "Sci-Fi", "Short", "Sport", "Talk-Show",
  "Thriller", "War", "Western",
] as const;

const COUNTRIES = [
  "United States", "United Kingdom", "Korea", "Japan", "Bangladesh", "China",
  "Egypt", "France", "Germany", "India", "Indonesia", "Iraq", "Italy",
  "Ivory Coast", "Kenya", "Lebanon", "Mexico", "Morocco", "Nigeria",
  "Pakistan", "Philippines", "Russia", "Saudi Arabia", "South Africa", "Spain",
  "Syria", "Thailand", "Malaysia", "Turkey",
] as const;

const LANGUAGE_VARIANTS = [
  "English dub", "French dub", "Hindi dub", "Bengali dub", "Urdu dub",
  "Punjabi dub", "Tamil dub", "Telugu dub", "Malayalam dub", "Kannada dub",
  "Arabic dub", "Arabic sub", "Tagalog dub", "Indonesian dub", "Russian dub",
  "Kurdish sub", "Spanish dub", "Spanish sub", "SpanishLatam dub",
] as const;

const SORT_MODES = [
  "ForYou", "Hottest", "Latest", "Rating", "Genre", "Year", "Country",
] as const;

const YEAR_FILTERS = [
  "2026", "2025", "2024", "2023", "2022", "2021", "2020",
  "2010s", "2000s", "1990s", "1980s", "Other",
] as const;

const headers = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
};

export type MovieBoxHomeSection = {
  id: string;
  label: string;
  items: Entertainment[];
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function absoluteUrl(value: string | undefined) {
  if (!value) return "";
  try {
    return new URL(value, SITE_BASE).toString();
  } catch {
    return "";
  }
}

function slugFromHref(href: string) {
  try {
    const url = new URL(href, SITE_BASE);
    const match = url.pathname.match(/^\/detail\/([^/?#]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

function titleFromSlug(slug: string) {
  const parts = slug.split("-").filter(Boolean);
  if (parts.length > 1 && /^[A-Za-z0-9]{8,}$/.test(parts.at(-1) ?? "")) {
    parts.pop();
  }
  return parts
    .join(" ")
    .replace(/\b(?:hindi|english|french|arabic|punjabi|telugu|tamil|urdu)\b$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function publicProviderId(slug: string) {
  return `mbweb-${slug}`;
}

export function parsePublicProviderId(id: string) {
  const match = id.match(/^mbweb-(.+)$/);
  return match?.[1] ?? null;
}

function yearFromText(text: string) {
  const match = text.match(/\b(?:19|20)\d{2}\b/);
  return match ? Number(match[0]) : undefined;
}

function ratingFromText(text: string) {
  const match =
    text.match(/\b(?:rating\s*)?(10(?:\.0)?|[0-9](?:\.\d)?)\s*\/\s*10\b/i) ??
    text.match(/\b(10(?:\.0)?|[0-9](?:\.\d)?)\s+(?=(?:19|20)\d{2}\b)/);
  const rating = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(rating) && rating >= 0 && rating <= 10 ? rating : undefined;
}

function genresFromText(text: string) {
  const normalized = text.toLowerCase();
  return GENRES.filter((genre) => {
    const token = genre.toLowerCase();
    return normalized.includes(token);
  });
}

function languagesFromText(text: string) {
  const values = new Set<string>();
  for (const match of text.matchAll(/\[([^\]]+)\]/g)) {
    const label = normalizeWhitespace(match[1]);
    if (label && label.length <= 32) values.add(label);
  }
  for (const variant of LANGUAGE_VARIANTS) {
    if (text.toLowerCase().includes(variant.toLowerCase())) values.add(variant);
  }
  return [...values];
}

function imageFromNode(
  $: cheerio.CheerioAPI,
  node: AnyNode,
) {
  const root = $(node);
  const image = root.is("img") ? root : root.find("img").first();
  return absoluteUrl(
    image.attr("src") ??
      image.attr("data-src") ??
      image.attr("data-original") ??
      image.attr("data-lazy-src"),
  );
}

function titleFromNode(
  $: cheerio.CheerioAPI,
  anchor: AnyNode,
  slug: string,
) {
  const root = $(anchor);
  const imageAlt = normalizeWhitespace(root.find("img").first().attr("alt") ?? "");
  const titleAttr = normalizeWhitespace(root.attr("title") ?? "");
  const heading = normalizeWhitespace(root.find("h1,h2,h3,h4,h5,strong").first().text());
  const ownText = normalizeWhitespace(root.text());

  const raw = imageAlt || titleAttr || heading || ownText || titleFromSlug(slug);
  return raw
    .replace(/^\d+\s+/, "")
    .replace(/^(?:Hindi|English|Punjabi|Telugu|Tamil|Urdu|Arabic|French)\s+/i, "")
    .replace(/\s+(?:Play|Watch)$/i, "")
    .trim();
}

function closestCard(
  $: cheerio.CheerioAPI,
  anchor: AnyNode,
) {
  const root = $(anchor);
  const candidates = root.parents("article,li,div").toArray();
  for (const candidate of candidates) {
    const text = normalizeWhitespace($(candidate).text());
    if (text.length >= 8 && text.length <= 1_500) return $(candidate);
  }
  return root;
}

function parseCatalog(
  html: string,
  forcedKind?: "movie" | "show",
  category?: string,
) {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const items: Entertainment[] = [];

  $('a[href*="/detail/"]').each((_index, anchor) => {
    const href = $(anchor).attr("href") ?? "";
    const slug = slugFromHref(href);
    if (!slug || seen.has(slug)) return;

    const card = closestCard($, anchor);
    const text = normalizeWhitespace(card.text());
    const title = titleFromNode($, anchor, slug);
    if (!title || title.toLowerCase() === "play") return;

    const kind =
      forcedKind ??
      (/\b(?:tv series|tv show|series)\b/i.test(text) ? "show" : "movie");
    const year = yearFromText(text);
    const rating = ratingFromText(text);
    const poster = imageFromNode($, card.get(0) ?? anchor);
    const synopsis =
      normalizeWhitespace(card.find("p").last().text()) ||
      "";

    seen.add(slug);
    items.push({
      id: publicProviderId(slug),
      slug: publicProviderId(slug),
      provider: "moviebox",
      providerId: slug,
      detailUrl: `/detail/${slug}`,
      title,
      kind,
      ...(year !== undefined ? { year } : {}),
      ...(rating !== undefined ? { rating } : {}),
      genres: genresFromText(text),
      poster,
      backdrop: poster,
      synopsis,
      languages: languagesFromText(text),
      ...(category ? { category } : {}),
    });
  });

  return items;
}

async function fetchPublicHtml(path: string) {
  const url = new URL(path, SITE_BASE);
  if (url.origin !== SITE_BASE) throw new Error("Unsupported MovieBox public URL.");

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(PUBLIC_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`MovieBox public page failed with HTTP ${response.status}.`);
  }
  return response.text();
}

function routeForKind(kind: "movie" | "show") {
  return kind === "show" ? "/tv-series" : "/movie";
}

export async function getPublicCatalogPage(
  kind: "movie" | "show",
  page = 1,
) {
  const safePage = Math.max(1, Math.floor(page));
  const url = new URL(routeForKind(kind), SITE_BASE);
  if (safePage > 1) url.searchParams.set("page", String(safePage));

  try {
    const html = await fetchPublicHtml(url.pathname + url.search);
    const items = parseCatalog(html, kind);
    return {
      items,
      page: safePage,
      hasNextPage: items.length >= 18,
    };
  } catch (error) {
    console.error(`MovieBox public ${kind} catalog error:`, error);
    return { items: [], page: safePage, hasNextPage: false };
  }
}

function categoryLabel(
  $: cheerio.CheerioAPI,
  anchor: AnyNode,
  href: string,
) {
  const direct = normalizeWhitespace($(anchor).text());
  if (direct && !/^more$/i.test(direct) && direct.length <= 80) return direct;

  const container = $(anchor).closest("section,article,div");
  const heading = normalizeWhitespace(
    container.find("h1,h2,h3,h4,h5").first().text(),
  );
  if (heading && heading.length <= 80) return heading;

  try {
    const url = new URL(href, SITE_BASE);
    const slug = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    return slug
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "MovieBox collection";
  } catch {
    return "MovieBox collection";
  }
}

function encodeCategoryHref(kind: "movie" | "show", href: string) {
  const prefix = kind === "show" ? "s" : "m";
  return `mbcat-${prefix}-${Buffer.from(href, "utf8").toString("base64url")}`;
}

function decodeCategoryHref(id: string) {
  const match = id.match(/^mbcat-([ms])-(.+)$/);
  if (!match) return null;
  try {
    return {
      kind: match[1] === "s" ? "show" as const : "movie" as const,
      href: Buffer.from(match[2], "base64url").toString("utf8"),
    };
  } catch {
    return null;
  }
}

function categoryKind(label: string, href: string) {
  const value = `${label} ${href}`.toLowerCase();
  if (/series|tv|drama/.test(value)) return "show";
  if (/movie|cinema|hollywood|bollywood|nollywood|south|boxoffice/.test(value)) {
    return "movie";
  }
  return "both";
}

export async function getPublicCategories(
  kind: "movie" | "show",
): Promise<ProviderCategory[]> {
  const paths = ["/", routeForKind(kind)];
  const results = await Promise.allSettled(paths.map(fetchPublicHtml));
  const seen = new Set<string>();
  const categories: ProviderCategory[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const $ = cheerio.load(result.value);

    $('a[href*="/ranking-list/"],a[href*="/web/category"]').each((_index, anchor) => {
      const href = $(anchor).attr("href")?.trim() ?? "";
      if (!href || seen.has(href)) return;

      let url: URL;
      try {
        url = new URL(href, SITE_BASE);
      } catch {
        return;
      }
      if (url.origin !== SITE_BASE) return;
      if (
        !url.pathname.startsWith("/ranking-list/") &&
        url.pathname !== "/web/category"
      ) {
        return;
      }

      const label = categoryLabel($, anchor, href);
      const inferred = categoryKind(label, href);
      if (inferred !== "both" && inferred !== kind) return;

      seen.add(href);
      categories.push({
        id: encodeCategoryHref(kind, url.pathname + url.search),
        provider: "moviebox",
        label,
        group: "moviebox-collections",
        kind,
        supportsPagination: true,
        supportedInPinflix: true,
      });
    });
  }

  return categories.slice(0, 30);
}

export async function getPublicCategoryPage(
  categoryId: string,
  page = 1,
) {
  const decoded = decodeCategoryHref(categoryId);
  if (!decoded) return null;

  const { href, kind } = decoded;
  const safePage = Math.max(1, Math.floor(page));
  let url: URL;
  try {
    url = new URL(href, SITE_BASE);
  } catch {
    return null;
  }

  if (url.origin !== SITE_BASE) return null;
  if (
    !url.pathname.startsWith("/ranking-list/") &&
    url.pathname !== "/web/category"
  ) {
    return null;
  }

  if (safePage > 1) url.searchParams.set("page", String(safePage));

  try {
    const html = await fetchPublicHtml(url.pathname + url.search);
    const items = parseCatalog(html, kind, categoryId);
    return {
      items,
      page: safePage,
      hasNextPage: items.length >= 18,
    };
  } catch (error) {
    console.error("MovieBox category error:", error);
    return { items: [], page: safePage, hasNextPage: false };
  }
}

function detailLabelValue($: cheerio.CheerioAPI, label: string) {
  const exact = label.toLowerCase();
  let value = "";

  $("body *").each((_index, element) => {
    if (value) return;
    const text = normalizeWhitespace($(element).clone().children().remove().end().text());
    if (text.toLowerCase() !== exact && text.toLowerCase() !== `${exact}:`) return;

    const parent = $(element).parent();
    const sibling = $(element).next();
    const candidate =
      normalizeWhitespace(sibling.text()) ||
      normalizeWhitespace(parent.text()).replace(new RegExp(`^${label}:?\\s*`, "i"), "");
    if (candidate && candidate.length <= 120) value = candidate;
  });

  return value;
}

function durationMinutesFromText(text: string) {
  const hour = text.match(/\b(\d{1,2})\s*h(?:\s*(\d{1,2})\s*m)?\b/i);
  if (hour) return Number(hour[1]) * 60 + Number(hour[2] ?? 0);
  const minutes = text.match(/\b(\d{1,3})\s*(?:min|mins|minutes)\b/i);
  return minutes ? Number(minutes[1]) : undefined;
}

function castFromPage($: cheerio.CheerioAPI) {
  const credits: Array<{ name: string; role?: string }> = [];
  const seen = new Set<string>();

  $('[class*="cast" i] a,[class*="actor" i] a,[class*="cast" i] li,[class*="actor" i] li')
    .each((_index, element) => {
      const text = normalizeWhitespace($(element).text());
      if (!text || text.length > 100) return;

      const parts = text.split(/\s+(?:as|—|-)\s+/i).map(normalizeWhitespace);
      const name = parts[0];
      if (!name || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      credits.push({
        name,
        ...(parts[1] ? { role: parts[1] } : {}),
      });
    });

  return credits.slice(0, 24);
}

export async function getPublicDetails(
  id: string,
): Promise<Entertainment | null> {
  const slug = parsePublicProviderId(id);
  if (!slug) return null;

  try {
    const html = await fetchPublicHtml(`/detail/${encodeURIComponent(slug)}`);
    const $ = cheerio.load(html);
    const body = normalizeWhitespace($("body").text());

    const title =
      normalizeWhitespace($('meta[property="og:title"]').attr("content") ?? "") ||
      normalizeWhitespace($("h1").first().text()) ||
      titleFromSlug(slug);
    if (!title) return null;

    const image = absoluteUrl(
      $('meta[property="og:image"]').attr("content") ??
        $("main img,article img").first().attr("src") ??
        $("img").first().attr("src"),
    );
    const description =
      normalizeWhitespace($('meta[name="description"]').attr("content") ?? "") ||
      normalizeWhitespace($("main p,article p").filter((_i, el) => normalizeWhitespace($(el).text()).length > 60).first().text());

    const typeValue = detailLabelValue($, "Type") || body;
    const kind = /\b(?:tv series|tv show|series)\b/i.test(typeValue)
      ? "show"
      : "movie";
    const year = yearFromText(detailLabelValue($, "Year") || body);
    const rating = ratingFromText(body);
    const ratingCountMatch = body.match(/([\d,]+)\s+(?:ratings?|votes?)\b/i);
    const ratingCount = ratingCountMatch
      ? Number(ratingCountMatch[1].replace(/,/g, ""))
      : undefined;
    const country =
      detailLabelValue($, "Country") ||
      COUNTRIES.find((name) => body.includes(name)) ||
      "";
    const durationMinutes = durationMinutesFromText(
      detailLabelValue($, "Duration") || body,
    );
    const genres = genresFromText(
      detailLabelValue($, "Genre") || detailLabelValue($, "Genres") || body,
    );

    return {
      id,
      slug: id,
      provider: "moviebox",
      providerId: slug,
      detailUrl: `/detail/${slug}`,
      title,
      kind,
      ...(year !== undefined ? { year } : {}),
      ...(rating !== undefined ? { rating } : {}),
      ...(ratingCount !== undefined && Number.isFinite(ratingCount)
        ? { ratingCount }
        : {}),
      genres,
      poster: image,
      backdrop: image,
      synopsis: description,
      ...(durationMinutes !== undefined ? { durationMinutes } : {}),
      ...(country ? { country } : {}),
      languages: languagesFromText(body),
      cast: castFromPage($),
    };
  } catch (error) {
    console.error("MovieBox public details error:", error);
    return null;
  }
}

function sectionItems(
  $: cheerio.CheerioAPI,
  section: AnyNode,
) {
  const html = $.html(section);
  return parseCatalog(html);
}

export async function getHomeSections(): Promise<MovieBoxHomeSection[]> {
  try {
    const html = await fetchPublicHtml("/");
    const $ = cheerio.load(html);
    const sections: MovieBoxHomeSection[] = [];
    const seenLabels = new Set<string>();

    $("section").each((index, section) => {
      const label = normalizeWhitespace(
        $(section).find("h1,h2,h3,h4").first().text(),
      );
      if (!label || seenLabels.has(label.toLowerCase())) return;

      const items = sectionItems($, section);
      if (items.length < 2) return;

      seenLabels.add(label.toLowerCase());
      sections.push({
        id: `moviebox-home-${index}`,
        label,
        items: items.slice(0, 20),
      });
    });

    if (sections.length) return sections;

    // Fallback for homepage layouts that use generic div wrappers rather than
    // semantic sections.
    $("h1,h2,h3,h4").each((index, heading) => {
      const label = normalizeWhitespace($(heading).text());
      if (!label || seenLabels.has(label.toLowerCase())) return;
      const container = $(heading).parent().get(0);
      if (!container) return;
      const items = sectionItems($, container);
      if (items.length < 2) return;
      seenLabels.add(label.toLowerCase());
      sections.push({
        id: `moviebox-home-heading-${index}`,
        label,
        items: items.slice(0, 20),
      });
    });

    return sections.slice(0, 20);
  } catch (error) {
    console.error("MovieBox home feed error:", error);
    return [];
  }
}

export function getMovieBoxTaxonomy() {
  return {
    contentTypes: ["movie", "tv_series", "animation"],
    genres: [...GENRES, "Other"],
    countries: [...COUNTRIES, "Other"],
    years: [...YEAR_FILTERS],
    languageVariants: [...LANGUAGE_VARIANTS],
    sortModes: [...SORT_MODES],
  };
}
