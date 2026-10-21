import Link from "next/link";
import { Film, Tv } from "lucide-react";
import { search, searchSchema } from "@/src/lib/cineplex/search";
import { categories } from "@/src/lib/cineplex/categories";

export const revalidate = 60;

type SearchParams = Promise<{ q?: string; page?: string; type?: string; category?: string; year?: string; sort?: string; letter?: string; genre?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const validated = searchSchema.safeParse({...params,year:params.year || undefined, letter:params.letter || undefined});
  const [response, taxonomy] = await Promise.allSettled([
    validated.success && (query || params.category || params.type) ? search(validated.data) : Promise.resolve(null), categories(),
  ]);
  const error = !validated.success ? 'Invalid search filters.' : response.status === 'rejected' ? 'CineplexBD is temporarily unavailable. Please try again.' : '';
  const catalog = response.status === 'fulfilled' ? response.value : null;
  const data = {results:catalog?.results ?? [], totalResults:catalog?.results.length ?? 0,totalPages:catalog?.hasNextPage ? page+1:page};
  const pageHref = (target: number) => '/search?' + new URLSearchParams({...Object.fromEntries(Object.entries(params).filter((entry): entry is [string,string] => typeof entry[1] === 'string')),page:String(target)});

  return (
    <div className="space-y-8">
      <section className="animate-slide-up">
        <Link href="/" className="tv-focus text-sm font-semibold text-zinc-400 hover:text-white">
          ← Discover
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-accent">Movie and TV discovery</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.04em] text-gradient md:text-5xl">Search PinFlix</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Search the available movie and TV catalog.
        </p>


      </section>

      <form action="/search" className="flex flex-wrap gap-3" aria-label="Catalog search filters">
        <input name="q" aria-label="Title" defaultValue={query} placeholder="Movie or series title" className="min-w-0 rounded-xl border border-white/10 bg-surface p-3 text-white" />
        <select name="type" aria-label="Content type" defaultValue={params.type ?? 'all'} className="rounded-xl bg-surface p-3"><option value="all">All content</option><option value="movie">Movies</option><option value="series">Series</option></select>
        <select name="category" aria-label="Category" defaultValue={params.category ?? ''} className="max-w-full rounded-xl bg-surface p-3"><option value="">All categories</option>{[...new Set(taxonomy.status === 'fulfilled' ? taxonomy.value.categories.map(item => item.categoryValue) : [])].map(value => <option key={value} value={value}>{value}</option>)}</select>
        <input name="year" aria-label="Year" type="number" min="1800" max="2200" placeholder="Year" defaultValue={params.year} className="w-24 rounded-xl bg-surface p-3" />
        <select name="sort" aria-label="Sort order" defaultValue={params.sort ?? 'source'} className="rounded-xl bg-surface p-3"><option value="source">Source order</option><option value="title">Title A–Z</option><option value="title-desc">Title Z–A</option></select>
        <input name="genre" aria-label="Category genre" placeholder="Genre (category browse)" defaultValue={params.genre} className="min-w-0 rounded-xl bg-surface p-3" />
        <select name="letter" aria-label="Initial letter" defaultValue={params.letter ?? ''} className="rounded-xl bg-surface p-3"><option value="">Any initial</option>{'#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => <option key={letter} value={letter}>{letter}</option>)}</select>
        <button className="rounded-full bg-accent px-5 py-2 font-semibold text-white">Search</button>
      </form>
      <p className="text-xs text-zinc-400">CineplexBD results only. Year, genre and initial letter use source filters when browsing a category without a title. Title-search filters and alphabetical sorting apply to the current source page; use Next to continue.</p>
      {error ? <div role="alert" className="glass-panel rounded-2xl p-7 text-zinc-400">{error}</div> : !query && !params.category && !params.type ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-12 text-center text-zinc-500">
          Enter a title to search the catalog.
        </div>
      ) : data.results.length ? (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              Results <span className="text-sm font-normal text-zinc-500">({data.totalResults})</span>
            </h2>
            <span className="text-sm text-zinc-500">Page {page}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-6">
            {data.results.map((item) => {
              return (
                <Link
                  key={item.id}
                  href={`/entertainment/${item.id}`}
                  className="movie-card media-focus group relative block aspect-[2/3] overflow-hidden rounded-2xl border border-white/5 bg-surface"
                >
                  {item.poster ? (
                    <img loading="lazy" decoding="async" src={item.poster} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="poster-fallback grid h-full place-items-center p-5 text-center font-bold text-white/70">{item.title}</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/15 to-transparent" />
                  <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-zinc-200 backdrop-blur">
                    <span className="inline-flex items-center gap-1">
                      {item.kind === "show" ? <Tv size={11} /> : <Film size={11} />}
                      {item.kind === "show" ? "Series" : "Movie"}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="line-clamp-2 font-bold text-white">{item.title}</h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      {[item.year, item.rating ? "★ " + item.rating.toFixed(1) : ""].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {(page > 1 || page < data.totalPages) && (
            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
              <div>
                {page > 1 && (
                  <Link
                    className="tv-focus rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold"
                    href={pageHref(page - 1)}
                  >
                    ← Previous
                  </Link>
                )}
              </div>
              <div>
                {page < data.totalPages && (
                  <Link
                    className="tv-focus rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold"
                    href={pageHref(page + 1)}
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-12 text-center text-zinc-500">
          No matching movies or TV shows on this source page.
          {catalog?.hasNextPage && <Link className="block mt-4 text-accent" href={pageHref(page+1)}>Next source page →</Link>}
        </div>
      )}
    </div>
  );
}
