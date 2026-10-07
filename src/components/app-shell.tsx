"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Clapperboard, Film, PlayCircle, UserRound } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { LiveSearch } from "@/src/components/live-search";

const nav = [
  { href: "/", label: "Discover" },
  { href: "/movies", label: "Movies" },
  { href: "/series", label: "Series" },
  { href: "/saved", label: "My List" },
  { href: "/login", label: "Login" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWatchRoute = pathname.startsWith("/watch/");

  if (isWatchRoute) return <div className="min-h-screen bg-black">{children}</div>;

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="fixed inset-x-0 top-4 z-50 px-3 sm:px-5">
        <div className="glass-nav mx-auto flex min-h-[64px] w-full max-w-7xl items-center justify-between gap-3 rounded-full px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-4 lg:gap-8">
            <Link href="/" className="media-focus flex min-h-11 shrink-0 items-center gap-2 rounded-full font-black tracking-tight">
              <PlayCircle className="text-brand" size={29} fill="currentColor" />
              <span className="text-xl sm:text-2xl">PIN<span className="font-light text-coral">FLIX</span></span>
            </Link>
            <nav className="hidden items-center gap-5 lg:flex">
              {nav.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className={cn("media-focus rounded-full px-1 py-2 text-sm font-semibold transition", active ? "text-white" : "text-zinc-400 hover:text-white")}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="ml-auto flex w-[min(48vw,420px)] min-w-[150px] items-center gap-2">
            <LiveSearch />
            <Link href="/saved" aria-label="Open My List" className="media-focus hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-brand/35 to-brand-2/35 text-white shadow-inner sm:grid">
              <UserRound size={17} />
            </Link>
          </div>
        </div>

        <nav className="mx-auto mt-2 flex max-w-md items-center justify-center gap-2 rounded-full border border-white/10 bg-bg/75 px-2 py-1.5 text-xs text-zinc-400 backdrop-blur-xl lg:hidden">
          {[
            { href: "/", label: "Discover", icon: PlayCircle },
            { href: "/movies", label: "Movies", icon: Film },
            { href: "/series", label: "Series", icon: Clapperboard },
            { href: "/saved", label: "My List", icon: Bookmark },
          ].map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={cn("media-focus flex min-h-9 items-center gap-1.5 rounded-full px-2.5 font-semibold", active ? "bg-white/10 text-white" : "hover:text-white")}>
                <Icon size={14} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main className={cn(pathname === "/" ? "min-h-screen" : "mx-auto min-h-screen max-w-[1400px] px-5 pb-24 pt-32 sm:px-8 md:px-12")}>
        {children}
      </main>

      <footer className="border-t border-white/5 px-5 py-8 text-center text-xs text-zinc-600">
        <p>Movie and TV metadata is supplied by TMDB. PinFlix uses its own interface and handles playback sources separately.</p>
      </footer>
    </div>
  );
}
