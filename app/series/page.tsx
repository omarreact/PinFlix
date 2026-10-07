import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { getTmdbDiscover } from "@/src/lib/tmdb";

export const revalidate = 300;

type SearchParams = Promise<{ page?: string }>;

export default async function SeriesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const catalog = await getTmdbDiscover("tv", page).catch(() => ({ items: [], page, hasNextPage: false }));

  return (
    <div className="space-y-9">
      <section className="animate-slide-up">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-accent">
          <Clapperboard size={14} />
          TMDB metadata
        </div>
        <h1 className="text-4xl font-black tracking-[-.04em] text-gradient md:text-5xl">Series</h1>
        <p className="mt-3 max-w-2xl text-sm font-light leading-6 text-zinc-400">
          Discover popular TV series with metadata and artwork supplied by TMDB.
        </p>
      </section>

      {catalog.items.length > 0 ? (
        <EntertainmentGrid items={catalog.items} />
      ) : (
        <div className="glass-panel rounded-2xl p-7 text-sm text-zinc-400">TMDB TV metadata is temporarily unavailable.</div>
      )}

      {(page > 1 || catalog.hasNextPage) && (
        <div className="flex items-center justify-between border-t border-white/10 pt-6">
          <div>{page > 1 && <Link className="tv-focus rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold" href={\`/series?page=\${page - 1}\`}>← Previous</Link>}</div>
          <span className="text-sm text-zinc-500">Page {page}</span>
          <div>{catalog.hasNextPage && <Link className="tv-focus rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold" href={\`/series?page=\${page + 1}\`}>Next →</Link>}</div>
        </div>
      )}
    </div>
  );
}
