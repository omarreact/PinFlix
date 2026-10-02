"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EntertainmentCard } from "@/src/components/entertainment/card";
import type { Entertainment } from "@/src/types/catalog";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [entertainment, setEntertainment] = useState<Entertainment[]>([]);
  const [loading, setLoading] = useState(false);
  const normalized = query.trim();

  useEffect(() => {
    if (!normalized) {
      setEntertainment([]);
      setLoading(false);
      return;
    }

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
      <div>
        <Link href="/" className="text-sm font-semibold text-muted hover:text-ink">← Home</Link>
        <h1 className="mt-6 text-3xl font-black">Search PinFlix</h1>
        <p className="mt-2 text-muted">Search CineplexBD movies and web series.</p>
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            setLoading(Boolean(value.trim()));
          }}
          placeholder="Search movies and web series..."
          className="mt-5 w-full rounded-2xl border border-line bg-surface px-5 py-4 text-ink placeholder:text-muted focus:border-brand"
        />
      </div>

      {!normalized ? (
        <p className="text-muted">Type a movie or web series title.</p>
      ) : loading ? (
        <p className="animate-pulse text-muted">Searching...</p>
      ) : (
        <section>
          <h2 className="mb-4 text-xl font-bold">
            Results <span className="text-sm font-normal text-muted">({entertainment.length})</span>
          </h2>
          {entertainment.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {entertainment.map((item) => <EntertainmentCard key={item.id} item={item} />)}
            </div>
          ) : (
            <p className="text-muted">No matching CineplexBD titles found.</p>
          )}
        </section>
      )}
    </div>
  );
}
