import type { Entertainment } from "@/src/types/catalog";
import { normalizeTitle, titlesIdentifySameWork } from "@/src/lib/title-match-utils";

export type SearchKind = "all" | "movie" | "show";
export type SearchSource = "all" | "catalog" | "tmdb";

export function safeSearchKind(value: string | null | undefined): SearchKind {
  return value === "movie" || value === "show" ? value : "all";
}
export function safeSearchSource(value: string | null | undefined): SearchSource {
  return value === "catalog" || value === "tmdb" ? value : "all";
}
export function safeSearchQuery(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g," ").slice(0, 100);
}
export function searchHref(item: Entertainment): string {
  return item.provider === "tmdb" && item.providerId
    ? `/title/${item.kind === "show" ? "tv" : "movie"}/${encodeURIComponent(item.providerId)}`
    : `/entertainment/${encodeURIComponent(item.id)}`;
}
export function searchScore(item: Entertainment, query: string): number {
  const title = normalizeTitle(item.title);
  const needle = normalizeTitle(query);
  if (!title || !needle) return 0;
  let points = 0;
  if (title === needle) points += 1_000;
  else if (title.startsWith(needle)) points += 650;
  else if (title.split(" ").some(word => word.startsWith(needle))) points += 370;
  else if (title.includes(needle)) points += 250;
  else {
    const terms = needle.split(" ").filter(Boolean);
    if (terms.every(term => title.includes(term))) points += 180;
  }
  if (points === 0) return 0;
  if (Number.isFinite(item.rating)) points += Math.min(10, item.rating!) * 2;
  if (item.year) points += Math.min(3, Math.max(0,(item.year-1990)/20));
  return points;
}
export function rankSearch(items: Entertainment[], query: string, kind: SearchKind): Entertainment[] {
  const byId = new Map(items.filter(item => kind === "all" || item.kind === kind).map(item => [item.id, item]));
  return [...byId.values()].sort((a,b) => searchScore(b,query)-searchScore(a,query) || a.title.localeCompare(b.title));
}
export function hideProviderDuplicates(tmdb: Entertainment[], provider: Entertainment[]): Entertainment[] {
  return tmdb.filter(title => !provider.some(item => titlesIdentifySameWork(title,item)));
}
