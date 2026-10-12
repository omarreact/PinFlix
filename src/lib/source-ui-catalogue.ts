import "server-only";
import { catalogProvider } from "@/src/lib/providers/catalog";
import { searchLibrary } from "@/src/lib/search-service";
import {
  CATALOGUE_GENRES,
  filterCatalogue,
  matchesGenre,
} from "@/src/lib/catalogue";
import { FIRST_YEAR, exactYear, parseYearSearch } from "@/src/lib/year-search";
import { toTitle, type Catalogue } from "@/src/lib/source-ui";

export async function sourceCatalogue(
  params: URLSearchParams,
): Promise<Catalogue> {
  const value = params.get("kind");
  const kind =
    value === "movie"
      ? "movie"
      : value === "series" || value === "show"
        ? "show"
        : "all";
  const rawPage = Number(params.get("page") ?? "1");
  const page = Number.isInteger(rawPage)
    ? Math.min(100, Math.max(1, rawPage))
    : 1;
  const query = (params.get("q") ?? "").trim().slice(0, 100);
  const intent = parseYearSearch(query, params.get("year"));
  const category = params.get("category") || params.get("genre");
  const genre = CATALOGUE_GENRES.find(
    (item) =>
      item.slug !== "adult" &&
      (item.slug === category ||
        item.label.toLowerCase() === category?.toLowerCase()),
  );
  if (category && !genre) throw new Error("Unknown collection");
  let items;
  let hasNext;
  if (intent.title.length >= 2 || intent.yearOnly) {
    const found = await searchLibrary({
      query,
      kind,
      year: params.get("year"),
      page,
    });
    if (found.status === "unavailable")
      throw new Error("Search is temporarily unavailable");
    items = found.catalog;
    hasNext = found.catalogHasMore;
  } else {
    const types: ("movie" | "show")[] =
      kind === "all" ? ["movie", "show"] : [kind];
    const results = await Promise.allSettled(
      types.map((type) => catalogProvider.getLatestPage(type, page)),
    );
    const available = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    if (!available.length)
      throw new Error("The catalogue is temporarily unavailable");
    items = available.flatMap((result) => result.items);
    hasNext = available.some((result) => result.hasNextPage);
  }
  items = exactYear(filterCatalogue(items, kind, null), intent.year);
  const latestYear = new Date().getUTCFullYear() + 1;
  const years = Array.from(
    { length: latestYear - FIRST_YEAR + 1 },
    (_, index) => latestYear - index,
  );
  const language = params.get("language");
  if (genre) items = items.filter((item) => matchesGenre(item, genre.slug));
  if (language)
    items = items.filter((item) => item.languages?.join(" · ") === language);
  if (params.get("sort") === "title")
    items.sort((a, b) => a.title.localeCompare(b.title));
  if (params.get("sort") === "year")
    items.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  return {
    items: items.map(toTitle),
    page,
    hasNext: Boolean(hasNext),
    years,
    categories: (["movie", "series"] as const).flatMap((type) =>
      CATALOGUE_GENRES.filter((g) => g.slug !== "adult").map((g) => ({
        name: g.label,
        kind: type,
        mature: false,
      })),
    ),
    stale: false,
    retrievedAt: new Date().toISOString(),
  };
}
