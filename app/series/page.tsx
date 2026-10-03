import Link from "next/link";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { CineplexCategoryNav } from "@/src/components/cineplex-category-nav";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";

type SearchParams = Promise<{
  category?: string;
  page?: string;
}>;

function pageHref(page: number, category?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (category) params.set("category", category);
  return `/series?${params.toString()}`;
}

export default async function SeriesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const categories = await cineplexbd.getCineplexCategories("tv");
  const activeCategory = params.category
    ? categories.find((category) => category.id === params.category)
    : undefined;

  const catalog = activeCategory
    ? await cineplexbd.getCategoryPage(activeCategory.id, page)
    : await cineplexbd.getLatestPage("show", page);

  const items = catalog?.items ?? [];
  const hasNext = catalog?.hasNextPage ?? false;
  const title = activeCategory?.label ?? "Latest web series";

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-brand">Web Series</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.03em] text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Explore web series, regional shows, animation and other episodic collections in one place.
        </p>
      </section>

      <CineplexCategoryNav categories={categories} activeId={activeCategory?.id} basePath="/series" />

      {items.length > 0 ? (
        <EntertainmentGrid items={items} />
      ) : (
        <div className="soft-card rounded-2xl p-6 text-sm text-muted">
          No series are available for this page right now. Try another category or refresh.
        </div>
      )}

      {(page > 1 || hasNext) && (
        <div className="flex items-center justify-between border-t border-line pt-5">
          <div>
            {page > 1 && (
              <Link
                className="tv-focus rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
                href={pageHref(page - 1, activeCategory?.id)}
              >
                ← Previous
              </Link>
            )}
          </div>
          <span className="text-sm font-medium text-muted">Page {page}</span>
          <div>
            {hasNext && (
              <Link
                className="tv-focus rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
                href={pageHref(page + 1, activeCategory?.id)}
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
