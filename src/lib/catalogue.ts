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
] as const;

export type CatalogueGenre = (typeof CATALOGUE_GENRES)[number]["slug"];
export type CatalogueKind = "all" | "movie" | "show";

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const SCI_FI = new Set(["scifi", "sciencefiction"]);

export function parseCatalogueKind(value: string | undefined | null): CatalogueKind {
  return value === "movie" || value === "show" ? value : "all";
}
export function parseCatalogueGenre(value: string | undefined | null): CatalogueGenre | null {
  return CATALOGUE_GENRES.find(genre => genre.slug === value)?.slug ?? null;
}
export function catalogueHref(kind: CatalogueKind = "all", genre: CatalogueGenre | null = null, page = 1): string {
  const q = new URLSearchParams();
  if (kind !== "all") q.set("kind", kind);
  if (genre) q.set("genre", genre);
  if (page > 1) q.set("page", String(page));
  return `/catalogue${q.size ? `?${q}` : ""}`;
}
export function matchesGenre(item: Entertainment, genre: CatalogueGenre): boolean {
  const target = norm(genre);
  return item.genres.some(value => {
    const actual = norm(value);
    return actual === target || (genre === "science-fiction" && SCI_FI.has(actual));
  });
}
export function filterCatalogue(items: Entertainment[], kind: CatalogueKind, genre: CatalogueGenre | null): Entertainment[] {
  const unique = [...new Map(items.filter(item => item.provider === "moviebox" || item.id.startsWith("mb-"))
    .map(item => [item.id, item])).values()];
  return unique.filter(item => (kind === "all" || item.kind === kind) && (!genre || matchesGenre(item, genre)));
}
export function availableGenres(items: Entertainment[]): typeof CATALOGUE_GENRES[number][] {
  return CATALOGUE_GENRES.filter(genre => items.some(item => matchesGenre(item, genre.slug)));
}
export function catalogueRails(items: Entertainment[], max = 4) {
  return CATALOGUE_GENRES.map(genre => {
    const matched = filterCatalogue(items, "all", genre.slug);
    return { ...genre, items: matched, count: matched.length };
  }).filter(group => group.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}
