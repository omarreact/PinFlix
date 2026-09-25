import Link from "next/link";
import { CineplexCategoryNav } from "@/src/components/cineplex-category-nav";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { entertainment as staticEntertainment } from "@/src/lib/iptv/catalog";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";

type SearchParams = Promise<{
  provider?: string;
  category?: string;
  page?: string;
}>;

export default async function MoviesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const categories = await cineplexbd.getCineplexCategories("movie");
  const activeCategory = params.category
    ? categories.find((category) => category.id === params.category)
    : undefined;

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const categoryPage = activeCategory
    ? await cineplexbd.getCategoryPage(activeCategory.id, page)
    : null;

  const latest = activeCategory ? [] : await cineplexbd.getLatest(1);
  const items = activeCategory
    ? categoryPage?.items ?? []
    : [...staticEntertainment.filter((item) => item.kind === "movie"), ...latest.filter((item) => item.kind === "movie")];

  return <div className="space-y-8">
    <div>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Movies</p>
      <h1 className="mt-2 text-3xl font-black">{activeCategory?.label ?? "Stories worth staying for"}</h1>
      <p className="mt-2 text-muted">Browse the CineplexBD movie catalog through PinFlix.</p>
    </div>

    <CineplexCategoryNav categories={categories} activeId={activeCategory?.id} basePath="/movies" />

    {items.length > 0
      ? <EntertainmentGrid items={items} />
      : <div className="rounded-2xl border border-line bg-surface p-6 text-muted">No titles were returned for this category.</div>}

    {activeCategory && categoryPage && <div className="flex items-center justify-between border-t border-line pt-5">
      <div>
        {page > 1 && <Link className="tv-focus rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold" href={`/movies?provider=cineplexbd&category=${encodeURIComponent(activeCategory.id)}&page=${page - 1}`}>← Previous</Link>}
      </div>
      <span className="text-sm text-muted">Page {page}</span>
      <div>
        {categoryPage.hasNextPage && <Link className="tv-focus rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold" href={`/movies?provider=cineplexbd&category=${encodeURIComponent(activeCategory.id)}&page=${page + 1}`}>Next →</Link>}
      </div>
    </div>}
  </div>;
}
