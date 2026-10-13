"use client";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  ArrowDown,
  Film,
} from "lucide-react";
import { franchiseCollection } from "@/src/lib/franchise-collections";
import { api, type Catalogue } from "@/src/lib/source-ui";
import { Card } from "./cards";
export function Browse({
  initial,
  kind,
  initialQuery = "",
  initialCategory = "",
  initialYear = "",
}: {
  initial: Catalogue;
  kind?: "movie" | "series";
  initialQuery?: string;
  initialCategory?: string;
  initialYear?: string;
}) {
  const [data, setData] = useState(initial);
  const [q, setQ] = useState(initialQuery);
  const [searchBy, setSearchBy] = useState("title");
  const [category, setCategory] = useState(initialCategory);
  const [year, setYear] = useState(initialYear);
  const [language, setLanguage] = useState("");
  const [quality, setQuality] = useState("");
  const [sort, setSort] = useState("recent");
  const [type, setType] = useState(kind || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const filterKey = JSON.stringify([
    q,
    searchBy,
    category,
    year,
    language,
    quality,
    sort,
    type,
  ]);
  const [loadedFilterKey, setLoadedFilterKey] = useState(filterKey);
  const first = useRef(true);
  const pagination = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  useEffect(() => () => pagination.current?.abort(), []);
  useEffect(() => {
    const version = ++requestVersion.current;
    pagination.current?.abort();
    if (first.current) {
      first.current = false;
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setBusy(true);
      setError("");
      const p = new URLSearchParams();
      Object.entries({
        q: searchBy === "title" ? q : "",
        actor: searchBy === "actor" ? q : "",
        category,
        year,
        language,
        quality,
        sort,
        kind: type,
      }).forEach(([k, v]) => {
        if (v) p.set(k, v);
      });
      fetch(api("/catalogue?" + p), { signal: controller.signal })
        .then(async (r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((next) => {
          if (
            !controller.signal.aborted &&
            version === requestVersion.current
          ) {
            setData(next);
            setLoadedFilterKey(filterKey);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted && e.name !== "AbortError")
            setError("We could not load this collection. Please try again.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
      pagination.current?.abort();
    };
  }, [
    q,
    category,
    year,
    language,
    quality,
    sort,
    type,
    refresh,
    searchBy,
    filterKey,
  ]);
  async function more() {
    if (loadedFilterKey !== filterKey || busy) return;
    const version = requestVersion.current;
    const controller = new AbortController();
    pagination.current?.abort();
    pagination.current = controller;
    setBusy(true);
    const p = new URLSearchParams({ page: String(data.page + 1) });
    Object.entries({
      q: searchBy === "title" ? q : "",
      actor: searchBy === "actor" ? q : "",
      category,
      year,
      language,
      quality,
      sort,
      kind: type,
    }).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    try {
      const r = await fetch(api("/catalogue?" + p), {
        signal: controller.signal,
      });
      if (!r.ok) throw new Error();
      const next: Catalogue = await r.json();
      if (controller.signal.aborted || version !== requestVersion.current)
        return;
      const combined = [
        ...new Map(
          [...data.items, ...next.items].map((title) => [title.id, title]),
        ).values(),
      ];
      if (sort === "title")
        combined.sort((a, b) => a.title.localeCompare(b.title));
      if (sort === "year")
        combined.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      setData({ ...next, items: combined });
    } catch {
      if (!controller.signal.aborted && version === requestVersion.current)
        setError("More titles could not be loaded. Try again.");
    } finally {
      if (!controller.signal.aborted && version === requestVersion.current)
        setBusy(false);
    }
  }
  const categories = [
    ...new Map(
      data.categories
        .filter(
          (category) => (!type || category.kind === type) && !category.mature,
        )
        .map((category) => [category.name, category]),
    ).values(),
  ];
  const franchise = franchiseCollection(category);
  const languages = [
    ...new Set(
      data.items.map((t) => t.language).filter((x): x is string => !!x),
    ),
  ].sort();
  return (
    <div className="page-content browse-page">
      <div className="page-title">
        <p className="eyebrow">YOUR NEXT GOOD FIND</p>
        <h1>
          {franchise
            ? `${franchise.label} collection.`
            : initialQuery
              ? "Search the stories"
              : kind === "series"
                ? "A season for everything."
                : kind === "movie"
                  ? "A world in every frame."
                  : "Discover something great."}
        </h1>
        <p>
          Explore{" "}
          {kind === "series"
            ? "series and seasons"
            : kind === "movie"
              ? "films from around the world"
              : "movies and series"}{" "}
          from the PinFlix collection.
        </p>
      </div>
      <div className="filter-panel">
        <label className="browse-search">
          <Search size={20} />
          <input
            aria-label="Search catalogue"
            placeholder="Title, year, language…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="filters">
          <SlidersHorizontal size={17} />
          <label>
            <span>Search by</span>
            <select
              aria-label="Search by"
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value)}
            >
              <option value="title">Title / keywords</option>
              <option value="actor" disabled>
                Cast member (not available)
              </option>
            </select>
          </label>
          {!kind && (
            <label>
              <span>Type</span>
              <select
                aria-label="Content type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setCategory("");
                }}
              >
                <option value="">All stories</option>
                <option value="movie">Movies</option>
                <option value="series">Series</option>
              </select>
            </label>
          )}
          <label>
            <span>Collection</span>
            <select
              aria-label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All collections</option>
              {categories.map((c) => (
                <option key={c.kind + c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Year</span>
            <select
              aria-label="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">Any year</option>
              {data.years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Language</span>
            <select
              aria-label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="">All languages</option>
              {languages.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Quality</span>
            <select
              aria-label="Quality"
              disabled={!data.items.some((item) => item.quality)}
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
            >
              <option value="">Any quality</option>
              {["4K", "1080P", "720P", "480P", "360P"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select
              aria-label="Sort titles"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Recently added</option>
              <option value="year">Release year</option>
              <option value="title">Title A–Z</option>
            </select>
          </label>
          <button
            aria-label="Refresh collection"
            className="icon-button"
            onClick={() => setRefresh((n) => n + 1)}
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </div>
      <div className="results-heading">
        <span>
          {data.items.length} {data.items.length === 1 ? "story" : "stories"} in
          this selection
        </span>
        {busy && <span role="status">Finding stories…</span>}
      </div>
      {error && (
        <div role="alert" className="notice">
          {error}
          <button onClick={() => setRefresh((n) => n + 1)}>Try again</button>
        </div>
      )}
      <div className={"card-grid " + (busy ? "is-loading" : "")}>
        {data.items.map((t) => (
          <Card key={t.id} title={t} />
        ))}
      </div>
      {!data.items.length && !busy && (
        <div className="empty">
          <Film size={32} />
          <h2>No stories found</h2>
          <p>Try another title or broaden your filters.</p>
          <button
            className="secondary"
            onClick={() => {
              setQ("");
              setCategory("");
              setYear("");
              setLanguage("");
              setQuality("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      {data.hasNext && (
        <div className="load-more">
          <button
            className="secondary"
            disabled={busy || loadedFilterKey !== filterKey}
            onClick={more}
          >
            More stories <ArrowDown size={17} />
          </button>
        </div>
      )}
      {data.stale && (
        <p className="availability-note">
          Showing cached titles from{" "}
          {new Date(data.retrievedAt).toLocaleDateString("en-GB", {
            timeZone: "UTC",
          })}{" "}
          while the collection reconnects.
        </p>
      )}
    </div>
  );
}
