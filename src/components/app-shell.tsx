"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Film, Home, ListVideo, Search, Tv } from "lucide-react";
import { cn } from "@/src/lib/utils";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse", label: "Live TV", icon: Tv },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/series", label: "Series", icon: Clapperboard },
  { href: "/saved", label: "My List", icon: ListVideo },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWatchRoute = pathname.startsWith("/watch/");
  return <div className={cn("min-h-screen pb-20 md:pb-0", isWatchRoute && "bg-black")}><header className={cn("sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur-xl", isWatchRoute && "hidden")}><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8"><Link href="/" className="tv-focus flex min-h-11 items-center gap-2 text-xl font-black tracking-tight"><span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-2 text-sm">P</span>PinFlix</Link><nav className="hidden items-center gap-1 md:flex">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("tv-focus flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold", pathname === href ? "bg-panel text-fg" : "text-muted hover:text-fg")}><Icon size={16} />{label}</Link>)}</nav><Link href="/search" aria-label="Search" className="tv-focus grid min-h-11 min-w-11 place-items-center rounded-md bg-surface text-muted hover:text-fg"><Search size={19} /></Link></div></header><main className={cn("mx-auto max-w-7xl px-4 py-7 md:px-8 md:py-10", isWatchRoute && "max-w-none py-4 md:px-6")}>{children}</main><nav className={cn("fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-bg/95 px-2 py-2 backdrop-blur-xl md:hidden", isWatchRoute && "hidden")}>{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("tv-focus flex min-h-11 min-w-14 flex-col items-center justify-center gap-1 rounded-md px-1 py-1 text-[10px] font-semibold", pathname === href ? "text-brand" : "text-muted")}><Icon size={19} />{label}</Link>)}</nav></div>;
}
