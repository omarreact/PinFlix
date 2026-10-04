import Link from "next/link";
import { Film } from "lucide-react";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { ProviderCategoryNav } from "@/src/components/provider-category-nav";
import { catalogProvider } from "@/src/lib/providers/catalog";

type SearchParams = Promise<{ category?: string; page?: string }>;

function pageHref(page: number, category?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (category) params.set("category", category);
  return `/movies?${params.toString()}`;
}

export default async function MoviesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const categories = await catalogProvider.getCategories("movie");
  const activeCategory = params.category
    ? categories.find((category) => category.id === params.category)
    : undefined;

  const catalog = activeCategory
    ? await catalogProvider.getCategoryPage(activeCategory.id, page)
    : await catalogProvider.getLatestPage("movie", page);

  const items = catalog?.items ?? [];
  const hasNext = catalog?.hasNextPage ?? false;
  const heading = activeCategory?.label ?? "Movies";

  return (
    <div className="space-y-9">
      <section className="animate-slide-up">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-accent">
          <Film size={14} />
          MovieBox catalog
        </div>
        <h1 className="text-4xl font-black tracking-[-.04em] text-gradient md:text-5xl">{heading}</h1>
        <p className="mt-3 max-w-2xl text-sm font-light leading-6 text-zinc-400">
          Browse movie titles and editorial collections directly from MovieBox.
        </p>
      </section>

      <ProviderCategoryNav categories={categories} activeId={activeCategory?.id} basePath="/movies" />

      {items.length > 0 ? (
        <EntertainmentGrid items={items} />
      ) : (
        <div className="glass-panel rounded-2xl p-7 text-sm text-zinc-400">
          <p className="font-semibold text-zinc-200">No MovieBox titles loaded for this view</p>
          <p className="mt-2 leading-6">
            The MovieBox catalog is temporarily unreachable. Try again shortly or check{" "}
            <a className="text-accent underline-offset-2 hover:underline" href="/api/health">
              /api/health
            </a>
            .
          </p>
        </div>
      )}

      {(page > 1 || hasNext) && (
        <div className="flex items-center justify-between border-t border-white/10 pt-6">
          <div>
            {page > 1 && (
              <Link className="tv-focus rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/10" href={pageHref(page - 1, activeCategory?.id)}>
                ← Previous
              </Link>
            )}
          </div>
          <span className="text-sm text-zinc-500">Page {page}</span>
          <div>
            {hasNext && (
              <Link className="tv-focus rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/10" href={pageHref(page + 1, activeCategory?.id)}>
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
