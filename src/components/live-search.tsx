"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clapperboard, Film, Search, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { searchHref, type SearchKind } from "@/src/lib/search-ranking";
import type { Entertainment } from "@/src/types/catalog";

type SearchResponse={
  query:string;kind:SearchKind;
  catalog:Entertainment[];discovery:Entertainment[];
  warnings?:string[];tmdbConfigured?:boolean;
};
const filters=[["all","All"],["movie","Movies"],["show","TV Shows"]] as const;
const STORAGE_KEY="pinflix-search-history-v1";
function getRecent():string[]{
  try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]") as unknown;
    return Array.isArray(data)?data.filter(v=>typeof v==="string").slice(0,5):[];}
  catch{return [];}
}
function saveRecent(value:string){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify([value,...getRecent().filter(v=>v.toLowerCase()!==value.toLowerCase())].slice(0,5)));}
  catch{ /* private browsing can disable storage */ }
}
function searchUrl(q:string,kind:SearchKind,source="all"){
  const params=new URLSearchParams({q,kind});
  if(source!=="all")params.set("source",source);
  return `/search?${params}`;
}

export function LiveSearch(){
  const router=useRouter();
  const inputRef=useRef<HTMLInputElement>(null);
  const rootRef=useRef<HTMLDivElement>(null);
  const id=useId();
  const listId=`pinflix-search-results-${id.replaceAll(":","")}`;
  const [query,setQuery]=useState("");
  const [kind,setKind]=useState<SearchKind>("all");
  const [open,setOpen]=useState(false);
  const [data,setData]=useState<SearchResponse|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(false);
  const [active,setActive]=useState(-1);
  const [recent,setRecent]=useState<string[]>([]);

  const provider=useMemo(()=>data?.catalog.slice(0,6)??[],[data]);
  const discovered=useMemo(()=>data?.discovery.slice(0,4)??[],[data]);
  const combined=useMemo(()=>[...provider,...discovered],[provider,discovered]);
  const term=query.trim();
  const ready=term.length>=2;

  const close=useCallback(()=>{setOpen(false);setActive(-1);},[]);
  useEffect(()=>{
    function onKey(event:globalThis.KeyboardEvent){
      const target=event.target as HTMLElement|null;
      const editing=Boolean(target?.closest("input, textarea, select, [contenteditable=true]"));
      if(((event.key==="/"&&!editing)||(event.key.toLowerCase()==="k"&&(event.metaKey||event.ctrlKey)))&&!event.altKey){
        event.preventDefault();setOpen(true);setRecent(getRecent());inputRef.current?.focus();
      }else if(event.key==="Escape"){
        close();
      }
    }
    function onOutside(event:PointerEvent){
      if(!rootRef.current?.contains(event.target as Node))close();
    }
    document.addEventListener("keydown",onKey);
    document.addEventListener("pointerdown",onOutside);
    return ()=>{document.removeEventListener("keydown",onKey);document.removeEventListener("pointerdown",onOutside);};
  },[close]);

  useEffect(()=>{
    if(!open||!ready)return;
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      try{
        const params=new URLSearchParams({q:term,kind});
        const response=await fetch(`/api/search/live?${params}`,{signal:controller.signal});
        if(!response.ok)throw Error("Search unavailable");
        const body=await response.json() as SearchResponse;
        if(!controller.signal.aborted){setData(body);setLoading(false);setError(false);}
      }catch{
        if(!controller.signal.aborted){setData(null);setLoading(false);setError(true);}
      }
    },220);
    return ()=>{window.clearTimeout(timer);controller.abort();};
  },[term,kind,open,ready]);

  function performSearch(event?:FormEvent){
    event?.preventDefault();
    if(!term)return;
    saveRecent(term);setRecent(getRecent());close();
    router.push(searchUrl(term,kind));
  }
  function switchKind(value:SearchKind){
    setKind(value);setData(null);setError(false);setActive(-1);
    if(ready)setLoading(true);
    inputRef.current?.focus();
  }
  function handleKey(event:KeyboardEvent<HTMLInputElement>){
    if(event.key==="ArrowDown"&&open&&combined.length){
      event.preventDefault();setActive(i=>(i+1)%combined.length);
    }else if(event.key==="ArrowUp"&&open&&combined.length){
      event.preventDefault();setActive(i=>i<=0?combined.length-1:i-1);
    }else if(event.key==="Enter"&&active>=0&&combined[active]&&open){
      event.preventDefault();saveRecent(term);close();router.push(searchHref(combined[active]));
    }else if(event.key==="Escape")close();
  }
  function renderItem(item:Entertainment,index:number,isProvider:boolean){
    const href=searchHref(item);
    return <Link key={`${item.provider}-${item.id}`} id={`${listId}-item-${index}`}
      role="option" aria-selected={index===active}
      href={href} onClick={()=>{if(term)saveRecent(term);close();}}
      onMouseEnter={()=>setActive(index)}
      className={`media-focus flex min-h-[68px] items-center gap-3 border-b border-line/60 px-3 py-2 text-left ${active===index?"bg-white/10":"hover:bg-white/5"}`}>
      <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-surface">
        {item.poster?<img src={item.poster} alt="" width={40} height={56} loading="lazy" className="h-full w-full object-cover"/>:<span className="grid h-full place-items-center text-muted">{item.kind==="show"?<Clapperboard size={17}/>:<Film size={17}/>}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{item.title}</p>
        <p className="mt-1 truncate text-xs text-muted">{item.kind==="show"?"TV Series":"Movie"}{item.year?` · ${item.year}`:""}{isProvider?" · Provider catalog":" · TMDB"}</p>
      </div>
      <ArrowRight size={15} className="shrink-0 text-muted"/>
    </Link>;
  }

  return <div ref={rootRef} className="relative w-full">
    <form onSubmit={performSearch} role="search">
      <div className="flex h-11 items-center gap-2 rounded-md border border-line bg-surface px-3 focus-within:border-brand">
        <Search size={18} className="shrink-0 text-muted" aria-hidden="true"/>
        <input ref={inputRef} type="search" value={query} maxLength={100}
          role="combobox" aria-label="Search movies and TV series" aria-autocomplete="list"
          aria-expanded={open} aria-controls={listId}
          aria-activedescendant={open&&active>=0?`${listId}-item-${active}`:undefined}
          autoComplete="off" placeholder="Search movies & TV shows…"
          onFocus={()=>{setOpen(true);setRecent(getRecent());if(ready)setLoading(true);}}
          onKeyDown={handleKey}
          onChange={event=>{setQuery(event.target.value);setData(null);setActive(-1);setError(false);setOpen(true);setLoading(event.target.value.trim().length>=2);}}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-fg outline-none placeholder:text-muted"/>
        {query?<button type="button" aria-label="Clear search" onClick={()=>{setQuery("");setData(null);setLoading(false);setActive(-1);inputRef.current?.focus();}} className="media-focus grid h-8 w-8 shrink-0 place-items-center rounded text-muted hover:text-fg"><X size={17}/></button>
        :<kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[10px] text-muted xl:inline">/</kbd>}
      </div>
    </form>

    {open&&<div id={listId} role="listbox" aria-label="Live movie and TV search suggestions"
      className="absolute right-0 top-[calc(100%+8px)] z-[80] w-[min(92vw,490px)] max-h-[min(75dvh,600px)] overflow-y-auto rounded-xl border border-line bg-panel shadow-[0_24px_65px_rgba(0,0,0,.65)]">
      <div className="sticky top-0 z-10 flex gap-1 border-b border-line bg-panel p-2" role="group" aria-label="Media type">
        {filters.map(([value,label])=><button key={value} type="button" aria-pressed={kind===value}
          onClick={()=>switchKind(value)}
          className={`media-focus min-h-9 flex-1 rounded-md px-3 text-xs font-semibold ${kind===value?"bg-brand text-bg":"bg-surface text-muted hover:text-fg"}`}>{label}</button>)}
      </div>
      {!ready?<div className="p-4">
        <p className="text-xs text-muted">Type at least 2 characters to search the whole catalog. Press <kbd>/</kbd> to search from anywhere.</p>
        {recent.length>0&&<div className="mt-4"><p className="pf-eyebrow mb-2">Recent searches</p>
          {recent.map(value=><button type="button" key={value} onClick={()=>{setQuery(value);setOpen(true);setLoading(true);setData(null);inputRef.current?.focus();}}
            className="media-focus block min-h-9 w-full truncate rounded px-2 text-left text-sm text-fg hover:bg-white/5">{value}</button>)}
        </div>}
      </div>:<>
        {loading&&<p role="status" className="px-4 py-5 text-sm text-muted">Searching movies and TV shows…</p>}
        {error&&!loading&&<p role="alert" className="px-4 py-5 text-sm text-muted">Search is temporarily unavailable. Press Enter to view full results.</p>}
        {!loading&&!error&&<>
          {provider.length>0&&<section aria-label="Provider catalog matches"><p className="pf-eyebrow bg-bg/50 px-3 py-2">From the PinFlix provider catalog</p>{provider.map((item,i)=>renderItem(item,i,true))}</section>}
          {discovered.length>0&&<section aria-label="TMDB title discovery"><p className="pf-eyebrow bg-bg/50 px-3 py-2">Discover more · TMDB metadata</p>{discovered.map((item,i)=>renderItem(item,provider.length+i,false))}</section>}
          {!combined.length&&<p className="px-4 py-5 text-sm text-muted">No matching titles. Try different spelling or the full search.</p>}
        </>}
        <button type="button" onClick={()=>performSearch()}
          className="media-focus sticky bottom-0 flex min-h-12 w-full items-center justify-center gap-2 border-t border-line bg-panel px-4 py-3 text-sm font-semibold text-brand hover:bg-surface">See all search results <ArrowRight size={16}/></button>
      </>}
    </div>}
  </div>;
}
