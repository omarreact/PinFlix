"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Bookmark, Clapperboard, Film, PlayCircle, Search, UserRound } from "lucide-react";
import { cn } from "@/src/lib/utils";

const nav = [
  { href: "/", label: "Discover" },
  { href: "/movies", label: "Movies" },
  { href: "/series", label: "Series" },
  { href: "/saved", label: "My List" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const isWatchRoute = pathname.startsWith("/watch/");

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  }

  if (isWatchRoute) return <div className="min-h-screen bg-black">{children}</div>;

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="fixed inset-x-0 top-4 z-50 px-3 sm:px-5">
        <div className="glass-nav mx-auto flex min-h-[64px] w-full max-w-7xl items-center justify-between gap-3 rounded-full px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-4 lg:gap-8">
            <Link href="/" className="tv-focus flex min-h-11 shrink-0 items-center gap-2 rounded-full font-black tracking-tight">
              <PlayCircle className="text-brand" size={29} fill="currentColor" />
              <span className="text-xl sm:text-2xl">PIN<span className="font-light text-brand-2">FLIX</span></span>
            </Link>
            <nav className="hidden items-center gap-5 lg:flex">
              {nav.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "tv-focus rounded-full px-1 py-2 text-sm font-semibold transition",
                      active ? "text-white" : "text-zinc-400 hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <form onSubmit={submitSearch} className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="Search titles"
                aria-label="Search titles"
                className="h-10 w-28 rounded-full border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-brand/60 focus:bg-white/10 sm:w-52 md:w-64"
              />
            </form>
            <Link
              href="/saved"
              aria-label="Open My List"
              className="tv-focus hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-brand/35 to-brand-2/35 text-white shadow-inner sm:grid"
            >
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
              <Link
                key={href}
                href={href}
                className={cn(
                  "tv-focus flex min-h-9 items-center gap-1.5 rounded-full px-2.5 font-semibold",
                  active ? "bg-white/10 text-white" : "hover:text-white",
                )}
              >
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
        <p>
          Discovery metadata may be provided by TMDB.{" "}
          <Link href="/credits" className="tv-focus rounded underline-offset-4 hover:text-zinc-300 hover:underline">
            Credits & attribution
          </Link>
        </p>
      </footer>
    </div>
  );
}
