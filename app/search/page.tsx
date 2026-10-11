import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { LiveSearch } from "@/src/components/live-search";
import { searchLibrary } from "@/src/lib/search-service";
import { safeSearchQuery, safeSearchKind, type SearchKind } from "@/src/lib/search-ranking";
import { parseYearSearch } from "@/src/lib/year-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";
type SearchParams = Promise<{ q?: string; page?: string; kind?: string; year?: string }>;
const kinds = [["all", "All titles"], ["movie", "Movies"], ["show", "TV Shows"]] as const;

function searchUrl(query:string,kind:SearchKind,year:number|null,page=1) {
  const params = new URLSearchParams({kind});
  if(query)params.set("q",query);
  if(year!==null)params.set("year",String(year));
  if(page>1)params.set("page",String(page));
  return `/search?${params}`;
}

export default async function SearchPage({searchParams}:{searchParams:SearchParams}) {
  const params = await searchParams;
  const query = safeSearchQuery(params.q);
  const kind = safeSearchKind(params.kind);
  const intent = parseYearSearch(query,params.year);
  const rawPage = Number(params.page || "1");
  const page = Number.isInteger(rawPage) ? Math.max(1,Math.min(100,rawPage)) : 1;
  const results = await searchLibrary({query,kind,year:params.year,page});
  const hasQuery = intent.title.length>=2 || intent.yearOnly;
  const heading = intent.yearOnly ? `released in ${intent.year}` :
    intent.year!==null ? `for “${intent.title}” in ${intent.year}` : `for “${query}”`;

  return <div className="space-y-8">
    <section className="max-w-4xl">
      <Link href="/" className="media-focus inline-flex min-h-10 items-center gap-2 text-xs text-muted hover:text-fg">
        <ArrowLeft size={15}/> Discover
      </Link>
      <p className="pf-eyebrow mt-7">THE PINFLIX COLLECTION</p>
      <h1 className="pf-title mt-3">Find something <span className="pf-serif">to watch.</span></h1>
      <p className="mt-4 text-sm leading-7 text-muted">Search the provider’s movies and TV shows by title, release year, or both. No TMDB-only results.</p>
      <div className="mt-7 max-w-2xl">
        <LiveSearch key={`${query}:${kind}:${params.year??""}`} initialQuery={query}
          initialKind={kind} initialYear={params.year??""}/>
      </div>
    </section>
    <nav aria-label="Filter by type" className="flex flex-wrap gap-2 border-b border-line pb-5">
      {kinds.map(([value,label]) => <Link key={value} href={searchUrl(query,value,intent.year)}
        aria-current={kind===value?"page":undefined}
        className={`media-focus inline-flex min-h-10 items-center rounded-md border px-4 text-xs font-semibold ${kind===value?"border-brand bg-brand text-bg":"border-line bg-surface text-muted hover:text-fg"}`}>
        {label}
      </Link>)}
      <Link href="/catalogue" className="media-focus ml-auto inline-flex min-h-10 items-center rounded-md border border-line px-4 text-xs font-semibold text-fg hover:bg-surface">Browse categories <ArrowRight size={14} className="ml-2"/></Link>
    </nav>
    <section aria-label="Release-year filter" className="glass-panel flex flex-wrap items-end gap-3 rounded-lg p-4">
      <form action="/search" role="search" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="kind" value={kind}/>
        <input type="hidden" name="q" value={query}/>
        <div>
          <label htmlFor="release-year" className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">
            <CalendarDays size={15}/> Release year
          </label>
          <input id="release-year" name="year" type="text" inputMode="numeric"
            pattern="[0-9]{4}" maxLength={4} placeholder="e.g. 2024"
            defaultValue={params.year??(intent.year!==null?String(intent.year):"")}
            className="min-h-11 w-36 rounded-md border border-line bg-bg px-3 text-sm text-fg outline-none focus:border-brand"/>
        </div>
        <button type="submit" className="pf-action min-h-11">Apply year <ArrowRight size={16}/></button>
      </form>
      {intent.year!==null&&<Link href={searchUrl(intent.title,kind,null)}
        className="pf-action pf-action-outline min-h-11">Clear year</Link>}
      <p className="w-full text-xs leading-5 text-muted">
        {intent.yearOnly ? "Year browsing checks the provider’s available catalogue windows and index. It is not a complete archive of every release." :
          "You can also type a year alone (2024) or combine a title and year (Loki 2021)."}
      </p>
    </section>
    {!hasQuery ? (
      <div className="glass-panel rounded-lg px-5 py-12 text-center text-sm text-muted">
        Enter a movie/TV title or select a four-digit release year to search.
      </div>
    ) : <section className="space-y-6" aria-label="Provider search results">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold text-fg">
          {results.status==="unavailable" ? "Search temporarily unavailable" :
            results.catalog.length ? `${results.catalog.length} results` : "No matching provider results"} {heading}
        </h2>
        <span className="text-xs text-muted">Page {page}</span>
      </div>
      {results.yearOnly&&<p className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-muted">
        Showing matching releases found in the current provider-index and catalogue pages. Older or unindexed releases may not appear here.
      </p>}
      {results.status==="unavailable" ? (
        <div role="status" className="glass-panel rounded-lg px-5 py-10 text-center">
          <p className="text-lg font-medium text-fg">The video provider could not complete this search</p>
          <p className="mt-2 text-sm text-muted">This does not mean the requested year or title is absent. Please try again shortly.</p>
          <Link href={searchUrl(query,kind,intent.year)} className="pf-action mt-5">Retry search <ArrowRight size={15}/></Link>
        </div>
      ) : results.catalog.length ? <EntertainmentGrid items={results.catalog}/> : (
        <div className="glass-panel rounded-lg px-5 py-12 text-center">
          <p className="text-lg font-medium text-fg">No matching titles found in the provider pages searched</p>
          <p className="mt-2 text-sm text-muted">
            {results.yearOnly ? "This does not confirm the provider has no releases from that year. Try another catalogue page or search a film by name." :
              "Try a shorter title, a different spelling or another release year."}
          </p>
          <Link href="/catalogue" className="pf-action mt-5">Browse catalogue <ArrowRight size={15}/></Link>
        </div>
      )}
      {(page>1||results.catalogHasMore)&&<nav aria-label="Search pagination" className="pf-divider flex items-center justify-between gap-3 pt-6">
        {page>1?<Link className="pf-action pf-action-outline" href={searchUrl(query,kind,intent.year,page-1)}>← Previous</Link>:<span/>}
        <span className="text-xs text-muted">Page {page}</span>
        {results.catalogHasMore&&<Link className="pf-action pf-action-outline" href={searchUrl(query,kind,intent.year,page+1)}>Next <ArrowRight size={15}/></Link>}
      </nav>}
      <p className="text-xs text-muted">Only provider-issued titles are displayed. Actual playback availability is confirmed when Play is pressed.</p>
    </section>}
  </div>;
}
