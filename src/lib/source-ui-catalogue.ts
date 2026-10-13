import "server-only";
import type { Entertainment } from "@/src/types/catalog";
import { catalogProvider } from "@/src/lib/providers/catalog";
import { searchLibrary } from "@/src/lib/search-service";
import {
  CATALOGUE_GENRES,
  filterCatalogue,
  matchesGenre,
} from "@/src/lib/catalogue";
import {
  FRANCHISE_COLLECTIONS,
  franchiseCollection,
  matchesFranchise,
} from "@/src/lib/franchise-collections";
import { FIRST_YEAR, exactYear, parseYearSearch } from "@/src/lib/year-search";
import {
  SCREENSHOT_CATEGORIES,
  screenshotCategory,
  matchesScreenshotCategory,
} from "@/src/lib/screenshot-categories";
import { normalizeTitle } from "@/src/lib/title-match-utils";
import { toTitle, type Catalogue } from "@/src/lib/source-ui";

export async function sourceCatalogue(
  params: URLSearchParams,
): Promise<Catalogue> {
  const category = params.get("category") || params.get("genre");
  const genre = CATALOGUE_GENRES.find(
    (item) =>
      item.slug !== "adult" &&
      (item.slug === category ||
        item.label.toLowerCase() === category?.toLowerCase()),
  );
  const screenshot = genre ? undefined : screenshotCategory(category);
  const value = params.get("kind") || screenshot?.kind;
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
  const actor = (params.get("actor") ?? "").trim().slice(0, 100);
  const requestedGenres = (params.get("genres") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const selectedYears = [
    ...new Set(
      (params.get("years") ?? "")
        .split(",")
        .map(Number)
        .filter(
          (value) =>
            Number.isInteger(value) &&
            value >= 1900 &&
            value <= new Date().getUTCFullYear() + 1,
        ),
    ),
  ];
  const franchise = franchiseCollection(category);
  if (category && !genre && !franchise && !screenshot)
    throw new Error("Unknown collection");
  const latestYear = new Date().getUTCFullYear() + 1;
  const years = Array.from(
    { length: latestYear - FIRST_YEAR + 1 },
    (_, index) => latestYear - index,
  );
  const categories = (["movie", "series"] as const).flatMap((type) =>
    [
      ...FRANCHISE_COLLECTIONS,
      ...SCREENSHOT_CATEGORIES.filter((category) => category.kind === type).map(
        (category) => ({ label: category.name }),
      ),
      ...CATALOGUE_GENRES.filter((g) => g.slug !== "adult"),
    ].map((g) => ({
      name: g.label,
      kind: type,
      mature: false,
    })),
  );
  if (screenshot?.unavailable)
    return {
      items: [],
      page,
      hasNext: false,
      years,
      categories,
      notice: screenshot.unavailable,
      stale: false,
      retrievedAt: new Date().toISOString(),
    };
  let items: Entertainment[];
  let hasNext;
  let notice: string | undefined = screenshot?.notice;
  if (actor && !intent.title) {
    const found = await catalogProvider.searchPage!(
      actor.split(",")[0].trim(),
      page,
      kind,
    );
    items = found.items;
    hasNext = found.hasNextPage;
  } else if (franchise && !intent.title) {
    const results = await Promise.allSettled(
      franchise.queries.map((query) =>
        searchLibrary({
          query,
          kind,
          year: params.get("year") ?? intent.year,
          page,
        }),
      ),
    );
    const available = results.flatMap((result) =>
      result.status === "fulfilled" && result.value.status === "ok"
        ? [result.value]
        : [],
    );
    if (!available.length)
      throw new Error("This collection is temporarily unavailable");
    items = available.flatMap((result) => result.catalog);
    hasNext = available.some((result) => result.catalogHasMore);
  } else if (intent.title.length >= 2 || intent.yearOnly) {
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
  const requestedQuality = params.get("quality");
  const resolution =
    requestedQuality?.toUpperCase() === "4K"
      ? 2160
      : Number.parseInt(requestedQuality ?? "", 10);
  if (
    actor ||
    screenshot?.country ||
    screenshot?.excludeCountries ||
    screenshot?.language ||
    screenshot?.excludeLanguages ||
    screenshot?.resolution ||
    resolution ||
    params.get("language")
  ) {
    const detailed: ((typeof items)[number] | null)[] = [];
    let cursor = 0,
      verified = 0,
      failed = 0;
    const deadline = Date.now() + 20_000;
    await Promise.all(
      Array.from({ length: Math.min(6, items.length) }, async () => {
        while (cursor < items.length) {
          if (Date.now() > deadline)
            throw new Error("Detailed filtering timed out. Please try again.");
          const index = cursor++;
          const item = items[index];
          let details = await catalogProvider.getDetails(item.id);
          if (!details) {
            failed++;
            detailed[index] = null;
            continue;
          }
          verified++;
          if (screenshot?.dubbed) {
            const variant = details.audioVersions?.find(
              (version) =>
                version.dubbed && version.language === screenshot.language,
            );
            if (!variant) {
              detailed[index] = null;
              continue;
            }
            details = await catalogProvider.getDetails(variant.id);
            if (!details) failed++;
          }
          detailed[index] = details ? { ...item, ...details } : null;
        }
      }),
    );
    if (items.length && !verified)
      throw new Error("Detailed catalogue information is unavailable");
    if (failed)
      notice =
        "Some title information could not be checked. Refresh to retry these filters.";
    items = detailed.filter((item): item is NonNullable<typeof item> =>
      Boolean(item),
    );

    if (actor)
      items = items.filter((item) =>
        actor
          .split(",")
          .filter(Boolean)
          .every((name) =>
            item.cast?.some((credit) =>
              normalizeTitle(credit.name).includes(normalizeTitle(name)),
            ),
          ),
      );
  }
  items = filterCatalogue(items, kind, null);
  if (resolution)
    items = items.filter((item) =>
      item.resolutions?.some((value) => value >= resolution),
    );
  if (screenshot)
    items = items.filter((item) => matchesScreenshotCategory(item, screenshot));
  if (requestedGenres.length)
    items = items.filter((item) =>
      requestedGenres.every((genre) =>
        item.genres.some(
          (value) =>
            normalizeTitle(value).replace(
              /^(science fiction|sci fi)$/,
              "scifi",
            ) ===
            normalizeTitle(genre).replace(
              /^(science fiction|sci fi)$/,
              "scifi",
            ),
        ),
      ),
    );
  if (selectedYears.length)
    items = items.filter(
      (item) => item.year && selectedYears.includes(item.year),
    );
  const language = params.get("language");
  if (franchise)
    items = items.filter((item) => matchesFranchise(item, franchise.slug));
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
    hasNext: Boolean(hasNext) && page < 100,
    years,
    categories,
    notice,
    stale: false,
    retrievedAt: new Date().toISOString(),
  };
}
