import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { catalogProvider } from "@/src/lib/providers/catalog";
import { filterCatalogue } from "@/src/lib/catalogue";

export const revalidate = 180;
export const preferredRegion = "sin1";

type SearchParams = Promise<{ page?: string }>;

export default async function SeriesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const catalog = await catalogProvider.getLatestPage("show", page).catch(() => ({ items: [], page, hasNextPage: false }));
  const titles = filterCatalogue(catalog.items, "show", null);

  return (
    <div className="space-y-9">
      <section className="">
        <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-accent">
          <Clapperboard size={14} />
          Playable catalog
        </div>
        <h1 className="text-4xl font-medium tracking-[-.055em] text-fg md:text-5xl">Series</h1>
        <p className="mt-3 max-w-2xl text-sm font-light leading-6 text-muted">
          Browse provider-backed TV series with episode navigation and PinFlix playback.
        </p>
      </section>

      {titles.length > 0 ? (
        <EntertainmentGrid items={titles} />
      ) : (
        <div className="glass-panel rounded-2xl p-7 text-sm text-muted">The series catalog is temporarily unavailable.</div>
      )}

      {(page > 1 || catalog.hasNextPage) && (
        <div className="flex items-center justify-between border-t border-white/10 pt-6">
          <div>{page > 1 && <Link className="tv-focus rounded-md border border-line bg-surface px-5 py-2.5 text-sm font-semibold" href={`/series?page=${page - 1}`}>← Previous</Link>}</div>
          <span className="text-sm text-zinc-500">Page {page}</span>
          <div>{catalog.hasNextPage && <Link className="tv-focus rounded-md border border-line bg-surface px-5 py-2.5 text-sm font-semibold" href={`/series?page=${page + 1}`}>Next →</Link>}</div>
        </div>
      )}
    </div>
  );
}
