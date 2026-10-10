"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Bookmark, History, Menu, X } from "lucide-react";
import { LiveSearch } from "@/src/components/live-search";

const links = [
  {href:"/",label:"Discover"},
  {href:"/movies",label:"Movies"},
  {href:"/series",label:"TV Shows"},
  {href:"/saved",label:"My List"},
  {href:"/history",label:"History"},
];

export function AppShell({children}:{children:React.ReactNode}) {
  const pathname=usePathname();
  const [expanded,setExpanded]=useState(false);
  const watching=pathname.startsWith("/watch/");
  if(watching) return <div className="min-h-screen bg-black">{children}</div>;

  return <div className="min-h-screen bg-bg text-fg">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[99] focus:bg-brand focus:px-4 focus:py-3 focus:text-bg">Skip to content</a>
    <header className="glass-nav sticky top-0 z-50">
      <div className="pf-container flex min-h-[76px] items-center justify-between gap-4">
        <Link href="/" aria-label="PinFlix home" onClick={()=>setExpanded(false)} className="pf-wordmark shrink-0 media-focus">
          <span className="pf-symbol" aria-hidden="true">p</span>
          <span>pinflix<span className="pf-dot">.</span></span>
        </Link>
        <nav aria-label="Primary navigation" className="pf-nav hidden items-center gap-6 lg:flex">
          {links.map(link=><Link key={link.href} href={link.href} aria-current={link.href==="/" ? pathname==="/"?"page":undefined : pathname.startsWith(link.href)?"page":undefined}>{link.label}</Link>)}
        </nav>
        <div className="pf-search ml-auto hidden w-[min(30vw,310px)] md:block"><LiveSearch/></div>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/saved" className="media-focus inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line" aria-label="Open My List"><Bookmark size={17}/></Link>
          <Link href="/login" className="media-focus inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-xs font-semibold">Sign in <ArrowUpRight size={15}/></Link>
        </div>
        <button type="button" className="media-focus inline-flex h-11 w-11 items-center justify-center rounded-md border border-line lg:hidden" aria-label={expanded?"Close menu":"Open menu"} aria-expanded={expanded} aria-controls="pinflix-menu" onClick={()=>setExpanded(p=>!p)}>{expanded?<X size={21}/>:<Menu size={21}/>}</button>
      </div>
      <div className="pf-container pb-3 md:hidden"><LiveSearch/></div>
      {expanded&&<nav id="pinflix-menu" aria-label="Mobile navigation" className="pf-container pf-nav flex flex-col gap-1 border-t border-line py-3 lg:hidden">
        {links.map(link=><Link key={link.href} href={link.href} onClick={()=>setExpanded(false)} aria-current={link.href==="/" ? pathname==="/"?"page":undefined : pathname.startsWith(link.href)?"page":undefined} className="media-focus rounded-md px-3 py-3 hover:bg-white/5">{link.label}</Link>)}
        <Link href="/login" onClick={()=>setExpanded(false)} className="media-focus rounded-md px-3 py-3 text-sm">Sign in</Link>
      </nav>}
    </header>
    <main id="main-content" className={pathname==="/"?"min-h-[65vh] pt-8":"pf-container min-h-[65vh] pb-20 pt-10"}>{children}</main>
    <footer className="pf-footer mt-14">
      <div className="pf-container grid gap-8 py-10 sm:grid-cols-[1fr_auto] sm:items-start">
        <div><Link href="/" className="pf-wordmark"><span className="pf-symbol" aria-hidden="true">p</span><span>pinflix<span className="pf-dot">.</span></span></Link>
          <p className="mt-4 text-sm text-muted">A little less scrolling. A little more cinema.</p></div>
        <div className="flex flex-wrap gap-6 text-xs text-muted"><Link href="/movies" className="hover:text-fg">Find a film <ArrowUpRight size={13} className="inline"/></Link><Link href="/series" className="hover:text-fg">TV Shows</Link><Link href="/saved" className="hover:text-fg">Your watchlist <Bookmark size={13} className="inline"/></Link><Link href="/history" className="hover:text-fg">Watch history <History size={13} className="inline"/></Link></div>
      </div>
      <div className="pf-container flex flex-wrap justify-between gap-3 border-t border-line py-5 text-[11px] text-subtle">
        <span>Film metadata where available via TMDB. Not endorsed or certified by TMDB.</span>
        <span>© {new Date().getFullYear()} PinFlix · Pincode IT</span>
      </div>
    </footer>
  </div>;
}
