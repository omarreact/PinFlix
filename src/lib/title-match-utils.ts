import type { Entertainment } from "@/src/types/catalog";

type Matchable = Pick<Entertainment, "title" | "kind" | "year">;

export function normalizeTitle(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

/** Require same media type and title; reject known conflicting release years.
 * Never map a TMDB ID directly to a provider playback ID.
 */
export function titlesIdentifySameWork(left: Matchable, right: Matchable): boolean {
  if (left.kind !== right.kind || !normalizeTitle(left.title)) return false;
  if (normalizeTitle(left.title) !== normalizeTitle(right.title)) return false;
  if (left.year && right.year && Math.abs(left.year - right.year) > 1) return false;
  return true;
}

export function firstExactMatch<T extends Matchable>(title: Matchable, candidates: T[]): T | null {
  return candidates.find(candidate => titlesIdentifySameWork(title, candidate)) ?? null;
}
