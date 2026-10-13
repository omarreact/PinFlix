import { franchiseCollection } from "@/src/lib/franchise-collections";
import { CATALOGUE_GENRES } from "@/src/lib/catalogue";
import { sourceCatalogue } from "@/src/lib/source-ui-catalogue";
import { Browse } from "./browse";
import type { Catalogue } from "@/src/lib/source-ui";
export async function BrowsePage({
  params,
  kind,
}: {
  params: Record<string, string | undefined>;
  kind?: "movie" | "series";
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value) query.set(key, value);
  if (kind) query.set("kind", kind);
  let initial: Catalogue;
  let unavailable = false;
  try {
    initial = await sourceCatalogue(query);
  } catch {
    unavailable = true;
    initial = {
      items: [],
      categories: [],
      years: [],
      hasNext: false,
      page: 1,
      stale: false,
      retrievedAt: new Date().toISOString(),
    };
  }
  return (
    <>
      {unavailable && (
        <div className="page-content">
          <p className="notice" role="status">
            The collection is temporarily unavailable. Use Refresh collection to
            try again.
          </p>
        </div>
      )}
      <Browse
        key={query.toString()}
        kind={kind}
        initial={initial}
        initialQuery={params.q ?? ""}
        initialCategory={
          franchiseCollection(params.category ?? params.genre)?.label ??
          CATALOGUE_GENRES.find(
            (genre) =>
              genre.slug === params.genre ||
              genre.label.toLowerCase() === params.category?.toLowerCase(),
          )?.label ??
          params.category ??
          ""
        }
        initialYear={params.year ?? ""}
      />
    </>
  );
}
