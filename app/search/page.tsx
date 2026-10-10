import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { catalogProvider } from "@/src/lib/providers/catalog";

export const revalidate = 60;
type SearchParams=Promise<{q?:string;page?:string}>;

export default async function SearchPage({searchParams}:{searchParams:SearchParams}){
  const params=await searchParams;
  const query=(params.q||"").trim().slice(0,100);
  const page=Math.max(1,Number.parseInt(params.page||"1",10)||1);
  const results=query?await catalogProvider.search(query,page).catch(()=>[]):[];
  const next=results.length>0;
  return <div className="space-y-8">
    <section className="max-w-3xl">
      <Link href="/" className="media-focus inline-flex items-center gap-2 text-xs text-muted hover:text-fg"><ArrowLeft size={15}/> Discover</Link>
      <p className="pf-eyebrow mt-8">THE COLLECTION</p>
      <h1 className="pf-title mt-3">Find your next <span className="pf-serif">story.</span></h1>
      <p className="mt-4 text-sm leading-7 text-muted">Find movies and series in the existing PinFlix playable catalog.</p>
      <form action="/search" role="search" className="mt-7 flex items-center gap-3 rounded-md border border-line bg-surface p-2 focus-within:border-brand">
        <Search size={20} className="ml-3 shrink-0 text-muted"/>
        <input name="q" defaultValue={query} placeholder="A title, a story, a world to discover…" aria-label="Search movies and TV shows"
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-fg outline-none"/>
        <button type="submit" className="pf-action min-h-10 shrink-0">Search <ArrowRight size={16}/></button>
      </form>
    </section>
    {query?<section className="space-y-6">
      <div className="pf-divider flex items-center justify-between gap-3 pt-6">
        <h2 className="text-xl font-medium">Search results <span className="text-sm text-muted">({results.length})</span></h2>
        <span className="text-xs text-muted">Page {page}</span>
      </div>
      {results.length?<EntertainmentGrid items={results}/>:<div className="glass-panel rounded-lg p-9 text-center text-sm text-muted">No matching titles in this collection.</div>}
      {(page>1||next)&&<div className="pf-divider flex items-center justify-between pt-5 text-xs">
        {page>1?<Link href={`/search?q=${encodeURIComponent(query)}&page=${page-1}`} className="pf-action pf-action-outline">Previous</Link>:<span/>}
        {next?<Link href={`/search?q=${encodeURIComponent(query)}&page=${page+1}`} className="pf-action pf-action-outline">Next <ArrowRight size={15}/></Link>:null}
      </div>}
    </section>:<div className="pf-divider py-8 text-sm text-muted">Enter a title to explore the collection.</div>}
  </div>;
}
