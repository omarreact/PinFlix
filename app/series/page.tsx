import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { CineplexCategoryNav } from "@/src/components/cineplex-category-nav";
import { TMDBMediaGrid } from "@/src/components/tmdb/media-grid";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";
import { isTMDBConfigured } from "@/src/lib/tmdb/client";
import { getPopularTV } from "@/src/lib/tmdb/queries";

type SearchParams = Promise<{ category?: string; page?: string }>;

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
  const title = activeCategory?.label ?? "Series";

  let tmdbItems: Awaited<ReturnType<typeof getPopularTV>>["results"] = [];
  let tmdbHasNext = false;

  if (items.length === 0 && isTMDBConfigured()) {
    const fallback = await getPopularTV(page).catch(() => null);
    if (fallback) {
      tmdbItems = fallback.results.map((item) => ({ ...item, media_type: "tv" as const }));
      tmdbHasNext = page < fallback.total_pages;
    }
  }

  const showTMDBFallback = items.length === 0 && tmdbItems.length > 0;
  const showNext = hasNext || tmdbHasNext;

  return (
    <div className="space-y-9">
      <section className="animate-slide-up">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-accent">
          <Clapperboard size={14} />
          PinFlix catalog
        </div>
        <h1 className="text-4xl font-black tracking-[-.04em] text-gradient md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm font-light leading-6 text-zinc-400">
          Explore series and episodic collections, with TMDB discovery available when the playback catalog is offline.
        </p>
      </section>

      <CineplexCategoryNav categories={categories} activeId={activeCategory?.id} basePath="/series" />

      {items.length > 0 ? (
        <EntertainmentGrid items={items} />
      ) : showTMDBFallback ? (
        <section className="space-y-5">
          <div className="glass-panel rounded-2xl p-5 text-sm text-zinc-400">
            <p className="font-semibold text-zinc-200">Playback catalog is temporarily unavailable</p>
            <p className="mt-2 leading-6">
              Showing TMDB series discovery so browsing remains available. These cards are metadata only and are not presented as playable titles.
            </p>
          </div>
          <TMDBMediaGrid items={tmdbItems} />
        </section>
      ) : (
        <div className="glass-panel rounded-2xl p-7 text-sm text-zinc-400">
          <p className="font-semibold text-zinc-200">No series loaded for this view</p>
          <p className="mt-2 leading-6">
            The playback catalog is temporarily unreachable. Try again shortly or check{" "}
            <a className="text-accent underline-offset-2 hover:underline" href="/api/health">
              /api/health
            </a>
            .
          </p>
        </div>
      )}

      {(page > 1 || showNext) && (
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
            {showNext && (
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
