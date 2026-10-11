import "server-only";
import { catalogProvider } from "@/src/lib/providers/catalog";
import { rankSearch, safeSearchKind, type SearchKind } from "@/src/lib/search-ranking";
import type { Entertainment } from "@/src/types/catalog";
import { isAdultTitle } from "@/src/lib/catalogue";
import { exactYear, parseYearSearch } from "@/src/lib/year-search";

export type SearchResultSet = {
  query: string;
  kind: SearchKind;
  page: number;
  year: number | null;
  yearOnly: boolean;
  catalog: Entertainment[];
  catalogHasMore: boolean;
  status: "ok" | "unavailable";
};

/** Search provider-issued IDs only. TMDB can enrich an existing title but
 * must never create a fake playable search result.
 *
 * The provider has no verified year filter endpoint. Standalone year searches
 * combine any indexed matches with a bounded catalogue window; they are
 * explicitly presented as partial results, not as a complete yearly archive.
 */
export async function searchLibrary(input: {
  query: string;
  kind?: SearchKind;
  page?: number;
  year?: string | number | null;
}): Promise<SearchResultSet> {
  const intent = parseYearSearch(input.query, input.year);
  const kind = safeSearchKind(input.kind);
  const page = Number.isInteger(input.page) ? Math.max(1, Math.min(100,input.page!)) : 1;
  const base:SearchResultSet = {
    query: intent.raw, kind, page, year: intent.year, yearOnly: intent.yearOnly,
    catalog: [], catalogHasMore: false, status: "ok",
  };
  if (intent.title.length < 2 && !intent.yearOnly) return base;

  if (intent.yearOnly && intent.year !== null) {
    const types:("movie"|"show")[] = kind === "all" ? ["movie","show"] : [kind];
    const [indexed, ...pages] = await Promise.all([
      catalogProvider.search(String(intent.year), page, kind).catch(() => null),
      ...types.flatMap(type => [
        catalogProvider.getLatestPage(type, Math.min(100,page * 2 - 1)).catch(() => null),
        catalogProvider.getLatestPage(type, Math.min(100,page * 2)).catch(() => null),
      ]),
    ]);
    const collected = [
      ...(indexed ?? []),
      ...pages.flatMap(result => result?.items ?? []),
    ].filter(item => catalogProvider.canHandleId(item.id) && !isAdultTitle(item));
    // No source responded with titles: do not misrepresent an outage as an
    // authoritative "nothing released that year" result.
    if (indexed === null && !pages.some(result => result && result.items.length)) {
      return {...base,status:"unavailable"};
    }
    const unique = [...new Map(exactYear(collected,intent.year)
      .filter(item => kind === "all" || item.kind === kind)
      .map(item => [item.id,item])).values()];
    unique.sort((a,b) => (b.rating ?? 0)-(a.rating ?? 0) || a.title.localeCompare(b.title));
    return {
      ...base,catalog:unique,
      catalogHasMore:(indexed?.length ?? 0)>=30 || pages.some(p=>p?.hasNextPage),
    };
  }

  try {
    const data = await catalogProvider.search(intent.title,page,kind);
    const titles = data.filter(item => catalogProvider.canHandleId(item.id) && !isAdultTitle(item));
    return {
      ...base,
      catalog:rankSearch(exactYear(titles,intent.year),intent.title,kind),
      catalogHasMore:data.length>=30,
    };
  } catch (error) {
    console.error("Provider full-index search unavailable:",error);
    return {...base,status:"unavailable"};
  }
}
