import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { searchLibrary } from "@/src/lib/search-service";
import { safeSearchQuery, safeSearchKind, type SearchKind } from "@/src/lib/search-ranking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type SearchParams = Promise<{ q?: string; page?: string; kind?: string }>;
const kinds = [["all", "All titles"], ["movie", "Movies"], ["show", "TV Shows"]] as const;

function searchUrl(query: string, kind: SearchKind, page = 1) {
  const params = new URLSearchParams({ q: query, kind });
  if (page > 1) params.set("page", String(page));
  return `/search?${params}`;
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = safeSearchQuery(params.q);
  const kind = safeSearchKind(params.kind);
  const rawPage = Number(params.page || "1");
  const page = Number.isInteger(rawPage) ? Math.max(1, Math.min(100, rawPage)) : 1;
  const results = await searchLibrary({ query, kind, page });

  return <div className="space-y-8">
    <section className="max-w-4xl">
      <Link href="/" className="media-focus inline-flex min-h-10 items-center gap-2 text-xs text-muted hover:text-fg">
        <ArrowLeft size={15}/> Discover
      </Link>
      <p className="pf-eyebrow mt-7">THE PINFLIX COLLECTION</p>
      <h1 className="pf-title mt-3">Find something <span className="pf-serif">to watch.</span></h1>
      <p className="mt-4 text-sm leading-7 text-muted">Search only movies and TV shows from the existing PinFlix video provider. No TMDB-only results or unavailable metadata-only listings.</p>
      <form action="/search" role="search" className="mt-7 flex items-center gap-2 rounded-md border border-line bg-surface p-2 focus-within:border-brand">
        <Search size={20} className="ml-2 shrink-0 text-muted"/>
        <input name="q" defaultValue={query} maxLength={100} aria-label="Search movies and TV shows"
          placeholder="Enter a movie or TV show title…" className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-fg outline-none"/>
        <input type="hidden" name="kind" value={kind}/>
        <button type="submit" className="pf-action min-h-10 shrink-0">Search <ArrowRight size={16}/></button>
      </form>
    </section>
    <nav aria-label="Filter by type" className="flex flex-wrap gap-2 border-b border-line pb-5">
      {kinds.map(([value, label]) => <Link key={value} href={searchUrl(query, value)}
        aria-current={kind === value ? "page" : undefined}
        className={`media-focus inline-flex min-h-10 items-center rounded-md border px-4 text-xs font-semibold ${kind === value ? "border-brand bg-brand text-bg" : "border-line bg-surface text-muted hover:text-fg"}`}>
        {label}
      </Link>)}
      <Link href="/catalogue" className="media-focus ml-auto inline-flex min-h-10 items-center rounded-md border border-line px-4 text-xs font-semibold text-fg hover:bg-surface">Browse categories <ArrowRight size={14} className="ml-2"/></Link>
    </nav>
    {query.length < 2 ? (
      <div className="glass-panel rounded-lg px-5 py-12 text-center text-sm text-muted">Enter at least two characters to search the PinFlix video catalogue.</div>
    ) : <section className="space-y-6" aria-label="Provider search results">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold text-fg">
          {results.catalog.length ? `${results.catalog.length} results` : "No matching titles"} for “{query}”
        </h2>
        <span className="text-xs text-muted">Page {page}</span>
      </div>
      {results.catalog.length ? <EntertainmentGrid items={results.catalog}/> : (
        <div className="glass-panel rounded-lg px-5 py-12 text-center">
          <p className="text-lg font-medium text-fg">Not in the current provider catalogue</p>
          <p className="mt-2 text-sm text-muted">Try a shorter title, a different spelling, or browse by genre.</p>
          <Link href="/catalogue" className="pf-action mt-5">Browse catalogue <ArrowRight size={15}/></Link>
        </div>
      )}
      {(page > 1 || results.catalogHasMore) && <nav aria-label="Search pagination" className="pf-divider flex items-center justify-between gap-3 pt-6">
        {page > 1 ? <Link className="pf-action pf-action-outline" href={searchUrl(query, kind, page - 1)}>← Previous</Link> : <span/>}
        <span className="text-xs text-muted">Page {page}</span>
        {results.catalogHasMore && <Link className="pf-action pf-action-outline" href={searchUrl(query, kind, page + 1)}>Next <ArrowRight size={15}/></Link>}
      </nav>}
      <p className="text-xs text-muted">Results come from the video provider. Individual playback availability is confirmed when the player resolves its source.</p>
    </section>}
  </div>;
}
