import { safeSearchQuery } from "./search-ranking";
import type { Entertainment } from "@/src/types/catalog";

export const FIRST_YEAR = 1900;
export function safeReleaseYear(value: unknown): number | null {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^(?:19|20)\d{2}$/.test(text)) return null;
  const parsed = Number(text);
  return parsed >= FIRST_YEAR && parsed <= new Date().getUTCFullYear() + 1 ? parsed : null;
}

export type YearSearchIntent = { raw: string; title: string; year: number | null; yearOnly: boolean };
/** Recognises '2024', 'Loki 2021', 'Loki (2021)' and a separate year filter.
 * A trailing year is a release-year constraint, not a literal title term.
 */
export function parseYearSearch(input: string | null | undefined, yearInput?: string | number | null): YearSearchIntent {
  const raw = safeSearchQuery(input);
  const explicit = safeReleaseYear(yearInput);
  const pure = safeReleaseYear(raw);
  if (pure !== null) return {raw, title: "", year: explicit ?? pure, yearOnly: true};
  const suffix = raw.match(/^(.*?)\s*[(\[]((?:19|20)\d{2})[)\]]\s*$/)
    ?? raw.match(/^(.*?)\s+((?:19|20)\d{2})\s*$/);
  const inferred = suffix ? safeReleaseYear(suffix[2]) : null;
  const title = inferred ? safeSearchQuery(suffix?.[1]) : raw;
  const year = explicit ?? inferred;
  return {raw,title,year,yearOnly: !title && year !== null};
}
export function exactYear(items: Entertainment[], year: number | null): Entertainment[] {
  return year === null ? items : items.filter(item => item.year === year);
}
