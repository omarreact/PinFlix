"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { EntertainmentCard } from "@/src/components/entertainment/card";
import type { Entertainment } from "@/src/types/catalog";
import { TMDBMediaGrid } from "@/src/components/tmdb/media-grid";
import type { TMDBMedia } from "@/src/lib/tmdb/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [entertainment, setEntertainment] = useState<Entertainment[]>([]);
  const [tmdb, setTmdb] = useState<TMDBMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const normalized = query.trim();

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
    if (!initial) return;
    const timer = window.setTimeout(() => {
      setQuery(initial);
      setLoading(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!normalized) return;

    let cancelled = false;
    const debounceId = window.setTimeout(() => {
      Promise.allSettled([
        fetch(`/api/search?q=${encodeURIComponent(normalized)}`).then((response) => response.json()),
        fetch(`/api/tmdb/search?q=${encodeURIComponent(normalized)}`).then((response) => response.json()),
      ]).then(([catalogResult, tmdbResult]) => {
        if (cancelled) return;
        setEntertainment(
          catalogResult.status === "fulfilled"
            ? (catalogResult.value as { entertainment?: Entertainment[] }).entertainment ?? []
            : [],
        );
        setTmdb(
          tmdbResult.status === "fulfilled"
            ? (tmdbResult.value as { results?: TMDBMedia[] }).results ?? []
            : [],
        );
        setLoading(false);
      }).catch(() => {
        if (!cancelled) {
          setEntertainment([]);
          setTmdb([]);
          setLoading(false);
        }
      });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceId);
    };
  }, [normalized]);

  return (
    <div className="space-y-8">
      <section className="animate-slide-up">
        <Link href="/" className="tv-focus inline-flex min-h-11 items-center rounded-full text-sm font-semibold text-zinc-400 hover:text-white">← Discover</Link>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-gradient md:text-5xl">Search PinFlix</h1>
        <p className="mt-3 text-sm text-zinc-400">Search movies and series by title.</p>

        <label className="glass-panel mt-6 flex min-h-14 max-w-3xl items-center gap-3 rounded-full px-5 focus-within:border-brand/60">
          <Search size={20} className="shrink-0 text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              setLoading(Boolean(value.trim()));
              if (!value.trim()) {
                setEntertainment([]);
                setTmdb([]);
              }
            }}
            placeholder="Search titles"
            className="min-w-0 flex-1 bg-transparent py-4 text-white placeholder:text-zinc-600"
          />
        </label>
      </section>

      {!normalized ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-12 text-center text-zinc-500">
          Start typing to search the catalog.
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="aspect-[2/3] animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : (
        <section>
          <h2 className="mb-5 text-xl font-bold text-white">
            Results <span className="text-sm font-normal text-zinc-500">({entertainment.length})</span>
          </h2>
          {entertainment.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-6">
              {entertainment.map((item) => <EntertainmentCard key={item.id} item={item} />)}
            </div>
          ) : null}

          {tmdb.length > 0 ? (
            <div className="mt-10">
              <p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-brand">TMDB discovery</p>
              <TMDBMediaGrid items={tmdb} />
            </div>
          ) : entertainment.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-12 text-center text-zinc-500">
              No titles found. Try a different spelling.
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
