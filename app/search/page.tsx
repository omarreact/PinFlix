import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { searchLibrary } from "@/src/lib/search-service";
import { safeSearchQuery, safeSearchKind, safeSearchSource, type SearchKind, type SearchSource } from "@/src/lib/search-ranking";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type SearchParams=Promise<{q?:string;page?:string;kind?:string;source?:string}>;
const kinds=[["all","All"],["movie","Movies"],["show","TV Shows"]] as const;
const sources=[["all","All results"],["catalog","Provider catalog"],["tmdb","TMDB discovery"]] as const;

function urlFor(query:string,kind:SearchKind,source:SearchSource,page=1){
  const params=new URLSearchParams({q:query,kind,source});
  if(page>1)params.set("page",String(page));
  return `/search?${params}`;
}
export default async function SearchPage({searchParams}:{searchParams:SearchParams}){
  const params=await searchParams;
  const query=safeSearchQuery(params.q);
  const kind=safeSearchKind(params.kind);
  const source=safeSearchSource(params.source);
  const raw=Number(params.page||"1");
  const page=Number.isInteger(raw)?Math.max(1,Math.min(100,raw)):1;
  const result=await searchLibrary({query,kind,source,page});
  const total=result.catalog.length+result.discovery.length;
  const hasNext=result.catalogHasMore||result.discoveryHasMore;

  return <div className="space-y-8">
    <section className="max-w-4xl">
      <Link href="/" className="media-focus inline-flex min-h-10 items-center gap-2 text-xs text-muted hover:text-fg"><ArrowLeft size={15}/> Discover</Link>
      <p className="pf-eyebrow mt-7">EXPLORE THE COLLECTION</p>
      <h1 className="pf-title mt-3">Find your next <span className="pf-serif">story.</span></h1>
      <p className="mt-4 text-sm leading-7 text-muted">Search movies and TV shows across the PinFlix provider catalog and TMDB movie discovery. Only provider titles use the existing playback system.</p>
      <form action="/search" role="search" className="mt-7 flex items-center gap-2 rounded-md border border-line bg-surface p-2 focus-within:border-brand">
        <Search size={20} className="ml-2 shrink-0 text-muted"/>
        <input name="q" defaultValue={query} maxLength={100} aria-label="Search movie or television title"
          placeholder="Movie, series, year, or title…" className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-fg outline-none"/>
        <input type="hidden" name="kind" value={kind}/>
        <input type="hidden" name="source" value={source}/>
        <button type="submit" className="pf-action min-h-10 shrink-0">Search <ArrowRight size={16}/></button>
      </form>
    </section>

    <section aria-label="Search filters" className="space-y-4 border-b border-line pb-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by media type">
        {kinds.map(([value,label])=><Link key={value} href={urlFor(query,value,source)} aria-current={kind===value?"page":undefined}
          className={`media-focus inline-flex min-h-10 items-center rounded-md border px-4 text-xs font-semibold ${kind===value?"border-brand bg-brand text-bg":"border-line bg-surface text-muted hover:text-fg"}`}>{label}</Link>)}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Search data source">
        {sources.filter(([value])=>value!=="tmdb"||result.tmdbConfigured).map(([value,label])=><Link key={value} href={urlFor(query,kind,value)}
          aria-current={source===value?"page":undefined} className={`media-focus inline-flex min-h-9 items-center rounded-md px-3 text-xs ${source===value?"bg-elevated text-fg ring-1 ring-brand/45":"text-muted hover:bg-surface hover:text-fg"}`}>{label}</Link>)}
      </div>
    </section>
    {!query||query.length<2?<div className="glass-panel rounded-lg px-5 py-12 text-center text-sm text-muted">Enter at least two characters to start searching.</div>:<>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-muted">{total===0?"No matches":`${total} results on this page`} for <strong className="text-fg">“{query}”</strong></p>
        <span className="text-xs text-muted">Page {page}</span>
      </div>
      {result.warnings.map(warning=><p key={warning} role="status" className="rounded-md border border-line bg-surface px-4 py-3 text-xs text-muted">{warning}</p>)}
      {result.catalog.length>0&&<section aria-label="Provider catalog results" className="space-y-5">
        <div className="pf-divider flex flex-wrap items-baseline justify-between gap-3 pt-5">
          <div><p className="pf-eyebrow mb-2">Provider-backed titles</p><h2 className="text-2xl font-medium text-fg">PinFlix catalog</h2></div>
          <p className="text-xs text-muted">Video availability is checked when you press Play.</p>
        </div>
        <EntertainmentGrid items={result.catalog}/>
      </section>}
      {result.discovery.length>0&&<section aria-label="TMDB discovery results" className="space-y-5">
        <div className="pf-divider flex flex-wrap items-baseline justify-between gap-3 pt-5">
          <div><p className="pf-eyebrow mb-2">Find more titles</p><h2 className="text-2xl font-medium text-fg">TMDB discovery</h2></div>
          <p className="text-xs text-muted">Metadata only · playback not guaranteed</p>
        </div>
        <EntertainmentGrid items={result.discovery}/>
      </section>}
      {total===0&&<div className="glass-panel rounded-lg px-5 py-12 text-center">
        <p className="text-lg font-medium text-fg">No matching titles found</p>
        <p className="mt-2 text-sm text-muted">Try a shorter title, different spelling, or switch from Movies to All.</p>
      </div>}
      {(page>1||hasNext)&&<nav aria-label="Search results pagination" className="pf-divider flex items-center justify-between gap-4 pt-6">
        {page>1?<Link className="pf-action pf-action-outline" href={urlFor(query,kind,source,page-1)}>← Previous</Link>:<span/>}
        <span className="text-xs text-muted">Page {page}</span>
        {hasNext?<Link className="pf-action pf-action-outline" href={urlFor(query,kind,source,page+1)}>Next <ArrowRight size={16}/></Link>:<span/>}
      </nav>}
    </>}
  </div>;
}
