import type { Entertainment } from "@/src/types/catalog";

export const CATALOGUE_GENRES = [
  { slug: "action", label: "Action" },
  { slug: "drama", label: "Drama" },
  { slug: "comedy", label: "Comedy" },
  { slug: "thriller", label: "Thriller" },
  { slug: "romance", label: "Romance" },
  { slug: "crime", label: "Crime" },
  { slug: "horror", label: "Horror" },
  { slug: "adventure", label: "Adventure" },
  { slug: "science-fiction", label: "Sci-Fi" },
  { slug: "animation", label: "Animation" },
  { slug: "mystery", label: "Mystery" },
  { slug: "fantasy", label: "Fantasy" },
  { slug: "documentary", label: "Documentary" },
  { slug: "family", label: "Family" },
  { slug: "adult", label: "Adult (18+)" },
] as const;

export type CatalogueGenre = (typeof CATALOGUE_GENRES)[number]["slug"];
export type CatalogueKind = "all" | "movie" | "show";

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const SCI_FI = new Set(["scifi", "sciencefiction"]);
// Only use provider-supplied age/genre labels. No title or synopsis guessing.
const ADULT_GENRE_ALIASES = new Set(["adult", "adultonly", "18", "18plus", "mature", "matureaudiences", "erotic", "r18", "nc17"]);
export function isAdultTitle(item: Entertainment): boolean {
  const labels = [...item.genres, item.category ?? "", ...(item.collections ?? [])];
  return labels.some(label => ADULT_GENRE_ALIASES.has(norm(label)));
}

export function parseCatalogueKind(value: string | undefined | null): CatalogueKind {
  return value === "movie" || value === "show" ? value : "all";
}
export function parseCatalogueGenre(value: string | undefined | null): CatalogueGenre | null {
  return CATALOGUE_GENRES.find(genre => genre.slug === value)?.slug ?? null;
}
export function catalogueHref(kind: CatalogueKind = "all", genre: CatalogueGenre | null = null, page = 1): string {
  const q = new URLSearchParams();
  if (kind !== "all") q.set("kind", kind);
  if (genre === "adult") {
    if (page > 1) q.set("page", String(page));
    return `/catalogue/adult${q.size ? `?${q}` : ""}`;
  }
  if (genre) q.set("genre", genre);
  if (page > 1) q.set("page", String(page));
  return `/catalogue${q.size ? `?${q}` : ""}`;
}
export function matchesGenre(item: Entertainment, genre: CatalogueGenre): boolean {
  if (genre === "adult") return isAdultTitle(item);
  const target = norm(genre);
  return item.genres.some(value => {
    const actual = norm(value);
    return actual === target || (genre === "science-fiction" && SCI_FI.has(actual));
  });
}
export function filterCatalogue(items: Entertainment[], kind: CatalogueKind, genre: CatalogueGenre | null): Entertainment[] {
  const unique = [...new Map(items.filter(item => item.provider === "moviebox" || item.id.startsWith("mb-"))
    .map(item => [item.id, item])).values()];
  return unique.filter(item =>
    (kind === "all" || item.kind === kind) &&
    (genre === "adult" ? isAdultTitle(item) : !isAdultTitle(item) && (!genre || matchesGenre(item, genre)))
  );
}
export function availableGenres(items: Entertainment[]): typeof CATALOGUE_GENRES[number][] {
  // Adults are available via their separately gated category, never via automatic homepage rails.
  return CATALOGUE_GENRES.filter(genre => genre.slug !== "adult" &&
    items.some(item => !isAdultTitle(item) && matchesGenre(item, genre.slug)));
}
export function catalogueRails(items: Entertainment[], max = 4) {
  return CATALOGUE_GENRES.filter(genre => genre.slug !== "adult").map(genre => {
    const matched = filterCatalogue(items, "all", genre.slug);
    return { ...genre, items: matched, count: matched.length };
  }).filter(group => group.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}
