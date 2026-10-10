import "server-only";
import { catalogProvider } from "@/src/lib/providers/catalog";
import { rankSearch, safeSearchKind, safeSearchQuery, type SearchKind } from "@/src/lib/search-ranking";
import type { Entertainment } from "@/src/types/catalog";
import { isAdultTitle } from "@/src/lib/catalogue";

export type SearchResultSet = {
  query: string;
  kind: SearchKind;
  page: number;
  catalog: Entertainment[];
  catalogHasMore: boolean;
};

/** Only search titles supplied by the actual playback catalog.
 * TMDB remains an optional metadata enhancer on individual detail pages,
 * never a searchable source of unplayable titles.
 */
export async function searchLibrary(input: {
  query: string;
  kind?: SearchKind;
  page?: number;
}): Promise<SearchResultSet> {
  const query = safeSearchQuery(input.query);
  const kind = safeSearchKind(input.kind);
  const page = Number.isInteger(input.page) ? Math.max(1, Math.min(100, input.page!)) : 1;
  if (query.length < 2) {
    return { query, kind, page, catalog: [], catalogHasMore: false };
  }
  const data = await catalogProvider.search(query, page);
  // Trust only provider-issued playback identifiers, never a TMDB metadata ID.
  const provider = data.filter((item) => catalogProvider.canHandleId(item.id) && !isAdultTitle(item));
  return {
    query, kind, page,
    catalog: rankSearch(provider, query, kind),
    catalogHasMore: data.length >= 30,
  };
}
