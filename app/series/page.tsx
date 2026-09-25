import Link from "next/link";
import { CineplexCategoryNav } from "@/src/components/cineplex-category-nav";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";

type SearchParams = Promise<{
  provider?: string;
  category?: string;
  page?: string;
}>;

export default async function SeriesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const categories = await cineplexbd.getCineplexCategories("tv");
  const defaultCategory =
    categories.find((category) => category.label.toLowerCase() === "web series") ??
    categories[0];

  const activeCategory = params.category
    ? categories.find((category) => category.id === params.category) ?? defaultCategory
    : defaultCategory;

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const categoryPage = activeCategory
    ? await cineplexbd.getCategoryPage(activeCategory.id, page)
    : null;

  return <div className="space-y-8">
    <div>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">TV Series</p>
      <h1 className="mt-2 text-3xl font-black">{activeCategory?.label ?? "Series & shows"}</h1>
      <p className="mt-2 text-muted">Browse CineplexBD series, animations, shows and sports collections.</p>
    </div>

    <CineplexCategoryNav categories={categories} activeId={activeCategory?.id} basePath="/series" />

    {categoryPage && categoryPage.items.length > 0
      ? <EntertainmentGrid items={categoryPage.items} />
      : <div className="rounded-2xl border border-line bg-surface p-6 text-muted">No series were returned for this category.</div>}

    {activeCategory && categoryPage && <div className="flex items-center justify-between border-t border-line pt-5">
      <div>
        {page > 1 && <Link className="tv-focus rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold" href={`/series?provider=cineplexbd&category=${encodeURIComponent(activeCategory.id)}&page=${page - 1}`}>← Previous</Link>}
      </div>
      <span className="text-sm text-muted">Page {page}</span>
      <div>
        {categoryPage.hasNextPage && <Link className="tv-focus rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold" href={`/series?provider=cineplexbd&category=${encodeURIComponent(activeCategory.id)}&page=${page + 1}`}>Next →</Link>}
      </div>
    </div>}
  </div>;
}
