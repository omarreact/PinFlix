"use client";

import Link from "next/link";
import { Film, Search, Tv } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Entertainment } from "@/src/types/catalog";

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("q")?.trim() ?? "";
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<Entertainment[]>([]);
  const [loading, setLoading] = useState(Boolean(initial));
  const [error, setError] = useState("");

  useEffect(() => {
    const q = initial;
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    fetch(\`/api/tmdb/search?q=\${encodeURIComponent(q)}\`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Search unavailable");
        return response.json() as Promise<{ results?: Entertainment[] }>;
      })
      .then((data) => {
        if (!cancelled) setResults(data.results ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setError("Search is temporarily unavailable.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initial]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    router.push(\`/search?q=\${encodeURIComponent(value)}\`);
  }

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

        <form onSubmit={submit} className="glass-panel mt-6 flex min-h-14 max-w-3xl items-center gap-3 rounded-full px-5">
          <Search size={20} className="text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movies and TV shows…"
            className="min-w-0 flex-1 bg-transparent py-4 text-white placeholder:text-zinc-600"
          />
        </form>
      </section>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="aspect-[2/3] animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-panel rounded-2xl p-7 text-sm text-zinc-400">{error}</div>
      ) : !initial ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-12 text-center text-zinc-500">
          Enter a title to search TMDB.
        </div>
      ) : results.length ? (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              Results <span className="text-sm font-normal text-zinc-500">({results.length})</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-6">
            {results.map((item) => {
              const type = item.kind === "show" ? "tv" : "movie";
              return (
                <Link
                  key={item.id}
                  href={\`/title/\${type}/\${item.providerId}\`}
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
                      {[item.year, item.rating ? \`★ \${item.rating.toFixed(1)}\` : ""].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-12 text-center text-zinc-500">
          No matching movies or TV shows found.
        </div>
      )}
    </div>
  );
}
