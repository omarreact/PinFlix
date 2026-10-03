"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { EntertainmentCard } from "@/src/components/entertainment/card";
import type { Entertainment } from "@/src/types/catalog";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [entertainment, setEntertainment] = useState<Entertainment[]>([]);
  const [loading, setLoading] = useState(false);
  const normalized = query.trim();

  useEffect(() => {
    if (!normalized) return;

    let cancelled = false;
    const debounceId = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(normalized)}`)
        .then((response) => response.json())
        .then((data: { entertainment?: Entertainment[] }) => {
          if (cancelled) return;
          setEntertainment(data.entertainment ?? []);
          setLoading(false);
        })
        .catch(() => {
          if (!cancelled) {
            setEntertainment([]);
            setLoading(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceId);
    };
  }, [normalized]);

  return (
    <div className="space-y-8">
      <section>
        <Link href="/" className="tv-focus inline-flex min-h-11 items-center rounded-xl text-sm font-semibold text-muted hover:text-brand">← Home</Link>
        <h1 className="mt-4 text-3xl font-black tracking-[-.03em] text-slate-950 sm:text-4xl">Search PinFlix</h1>
        <p className="mt-2 text-sm text-muted">Find movies and web series by title.</p>

        <label className="mt-6 flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-white px-4 shadow-sm focus-within:border-brand focus-within:ring-4 focus-within:ring-violet-100">
          <Search size={20} className="shrink-0 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              const hasQuery = Boolean(value.trim());
              setQuery(value);
              setLoading(hasQuery);
              if (!hasQuery) setEntertainment([]);
            }}
            placeholder="Search movies and web series..."
            className="min-w-0 flex-1 bg-transparent py-4 text-slate-950 placeholder:text-slate-400"
          />
        </label>
      </section>

      {!normalized ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-muted">
          Start typing to search the catalog.
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="aspect-[2/3] animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <section>
          <h2 className="mb-4 text-xl font-black text-slate-950">
            Results <span className="text-sm font-medium text-muted">({entertainment.length})</span>
          </h2>
          {entertainment.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {entertainment.map((item) => (
                <div key={item.id} className="[&>a]:w-full">
                  <EntertainmentCard item={item} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-muted">
              No matching titles found. Try a different spelling.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
