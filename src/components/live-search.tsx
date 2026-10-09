"use client";

import Link from "next/link";
import { Film, Search, Tv } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Entertainment } from "@/src/types/catalog";

export function LiveSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Entertainment[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const value = query.trim();
    if (!value) return;

    const timer = window.setTimeout(async () => {
      const id = ++requestId.current;
      setLoading(true);

      try {
        const response = await fetch("/api/tmdb/search?q=" + encodeURIComponent(value));
        if (!response.ok) throw new Error("Search failed");
        const data = (await response.json()) as { results?: Entertainment[] };

        if (id !== requestId.current) return;
        setResults((data.results ?? []).slice(0, 8));
        setOpen(true);
      } catch {
        if (id === requestId.current) {
          setResults([]);
          setOpen(true);
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setOpen(false);
    router.push("/search?q=" + encodeURIComponent(value));
  }

  return (
    <div className="relative w-full">
      <form onSubmit={submit}>
        <label className="flex h-10 items-center rounded-full border border-white/10 bg-white/5 px-3 transition focus-within:border-brand/60 focus-within:bg-white/10">
          <Search size={16} className="shrink-0 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (!value.trim()) {
                ++requestId.current;
                setResults([]);
                setOpen(false);
                setLoading(false);
              }
            }}
            onFocus={() => query.trim() && setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 160)}
            type="search"
            placeholder="Search playable titles"
            aria-label="Search playable movies and TV shows"
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white placeholder:text-zinc-500"
          />
        </label>
      </form>

      {open && (
        <div className="absolute right-0 top-12 z-[80] w-[min(92vw,440px)] overflow-hidden rounded-2xl border border-white/10 bg-[#120303]/95 shadow-2xl backdrop-blur-2xl">
          {loading ? (
            <div className="p-4 text-sm text-zinc-400">Searching playable catalog…</div>
          ) : results.length ? (
            <>
              {results.map((item) => (
                <Link
                  key={item.id}
                  href={`/entertainment/${item.id}`}
                  className="flex items-center gap-3 border-b border-white/5 p-3 transition hover:bg-white/[.06]"
                >
                  <div className="h-[66px] w-11 shrink-0 overflow-hidden rounded-lg bg-white/5">
                    {item.poster ? (
                      <img src={item.poster} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {item.kind === "show" ? (
                        <Tv size={13} className="text-accent" />
                      ) : (
                        <Film size={13} className="text-accent" />
                      )}
                      <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {item.kind === "show" ? "TV Series" : "Movie"}
                      {item.year ? " · " + item.year : ""}
                    </p>
                    {item.synopsis && (
                      <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{item.synopsis}</p>
                    )}
                  </div>
                </Link>
              ))}
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  router.push("/search?q=" + encodeURIComponent(query.trim()));
                }}
                className="w-full p-3 text-center text-sm font-semibold text-accent transition hover:bg-white/[.05]"
              >
                View all results
              </button>
            </>
          ) : (
            <div className="p-4 text-sm text-zinc-500">No matching playable titles.</div>
          )}
        </div>
      )}
    </div>
  );
}
