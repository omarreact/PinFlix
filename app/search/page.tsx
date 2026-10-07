import Link from "next/link";
import { Film, Search, Tv } from "lucide-react";
import { searchTmdb } from "@/src/lib/tmdb";

export const revalidate = 60;

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const data = query
    ? await searchTmdb(query, page).catch(() => ({
        results: [],
        page,
        totalPages: 0,
        totalResults: 0,
      }))
    : { results: [], page: 1, totalPages: 0, totalResults: 0 };

  return (
    <div className="space-y-8">
      <section className="animate-slide-up">
        <Link href="/" className="tv-focus text-sm font-semibold text-zinc-400 hover:text-white">
          ← Discover
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-accent">TMDB discovery</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.04em] text-gradient md:text-5xl">Search PinFlix</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Search movie and TV metadata from TMDB. Playback availability is handled separately.
        </p>

        <form action="/search" className="glass-panel mt-6 flex min-h-14 max-w-3xl items-center gap-3 rounded-full px-5">
          <Search size={20} className="text-zinc-500" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search movies and TV shows…"
            className="min-w-0 flex-1 bg-transparent py-4 text-white placeholder:text-zinc-600"
          />
        </form>
      </section>

      {!query ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-12 text-center text-zinc-500">
          Enter a title to search TMDB.
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
              const type = item.kind === "show" ? "tv" : "movie";
              return (
                <Link
                  key={item.id}
                  href={"/title/" + type + "/" + item.providerId}
                  className="movie-card media-focus group relative block aspect-[2/3] overflow-hidden rounded-2xl border border-white/5 bg-surface"
                >
                  {item.poster ? (
                    <img src={item.poster} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
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
                    href={"/search?q=" + encodeURIComponent(query) + "&page=" + (page - 1)}
                  >
                    ← Previous
                  </Link>
                )}
              </div>
              <div>
                {page < data.totalPages && (
                  <Link
                    className="tv-focus rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold"
                    href={"/search?q=" + encodeURIComponent(query) + "&page=" + (page + 1)}
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
          No matching movies or TV shows found.
        </div>
      )}
    </div>
  );
}
