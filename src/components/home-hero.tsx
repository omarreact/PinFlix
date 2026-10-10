import Link from "next/link";
import { ArrowDown, ArrowUpRight, Film, Play, Sparkles } from "lucide-react";
import { SavedToggle } from "@/src/components/saved-toggle";
import { mediaTheme } from "@/src/lib/media-theme";
import type { Entertainment } from "@/src/types/catalog";

export function HomeHero({item}:{item?:Entertainment}) {
  const image=item?.backdrop||item?.poster||"";
  const isTmdb=item?.provider==="tmdb"&&item.providerId;
  const details=item?(isTmdb?`/title/${item.kind==="show"?"tv":"movie"}/${item.providerId}`:`/entertainment/${item.id}`):"/movies";
  const primary=item&&!isTmdb?`${details}?autoplay=1`:details;
  return <div className="pf-container" style={mediaTheme(image||item?.title)}>
    <section className="pf-editorial-hero" aria-label="Featured cinema">
      <div className="min-w-0">
        <p className="pf-eyebrow flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--media-accent)]"/> CURATED FOR THE CURIOUS</p>
        <h1 className="pf-title mt-6">Your next<br/>great <em className="pf-serif">film.</em></h1>
        <p className="mt-5 max-w-[28rem] text-sm leading-7 text-muted md:text-base">Big feelings. New worlds. Stories that stay. Find something worth your evening.</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          {item?<Link href={primary} className="pf-action media-focus">{isTmdb?<Film size={17}/>:<Play size={17} fill="currentColor"/>}{isTmdb?"Explore title":"Watch featured"}</Link>:<Link href="/movies" className="pf-action">Explore movies <ArrowDown size={17}/></Link>}
          <Link href={details} className="pf-action pf-action-outline media-focus">Film details <ArrowUpRight size={17}/></Link>
        </div>
        {item&&<div className="mt-5"><SavedToggle item={{id:item.id,slug:item.slug,title:item.title,kind:item.kind,poster:item.poster,year:item.year,genres:item.genres}}/></div>}
        <p className="mt-9 text-xs leading-6 text-subtle">MADE FOR FILM LOVERS. <span className="text-fg">FROM THE FIRST FRAME TO THE LAST.</span></p>
      </div>
      <div className="pf-hero-art" aria-label={item?.title||"PinFlix cinema"}>
        {image?<img src={image} alt="" fetchPriority="high" loading="eager" decoding="async"/>:<div className="poster-fallback absolute inset-0 flex items-center justify-center"><Film size={80} className="opacity-50"/></div>}
        <div className="absolute inset-x-5 top-5 z-[1] flex justify-between gap-2 text-[10px] font-bold tracking-[.18em] text-white"><span>THE EVENING EDIT</span><span>PINFLIX / FEATURED</span></div>
        <div className="pf-hero-caption flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 text-[var(--media-accent)]"><Sparkles size={21}/></span>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{item?.title||"A world of film awaits."}</p><p className="mt-1 truncate text-xs text-muted">{item?.year||"New"} · {item?.kind==="show"?"TV Series":"Movie"} · Discover something special</p></div>
          <Link href={details} className="media-focus ml-auto rounded-lg border border-white/20 p-2" aria-label="Explore featured title"><ArrowUpRight size={19}/></Link>
        </div>
      </div>
    </section>
    <div className="pf-editorial-strip" aria-label="PinFlix editorial values"><span>A WORLD OF CINEMA</span><span><i/> LESS SCROLLING, MORE STORIES</span><span><i/> THE NEXT FAVORITE IS HERE</span></div>
  </div>;
}
