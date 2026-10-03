"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clapperboard,
  Download,
  Film,
  Home,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

const primaryNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/series", label: "Web Series", icon: Clapperboard },
  { href: "/search", label: "Search", icon: Search },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWatchRoute = pathname.startsWith("/watch/");

  if (isWatchRoute) {
    return <div className="min-h-screen bg-black">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-[#f8fafc] px-4 py-5 lg:flex">
        <Link href="/" className="tv-focus flex min-h-11 items-center gap-3 rounded-xl px-2 text-xl font-black tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-sm font-black text-white shadow-sm">P</span>
          <span>PinFlix</span>
        </Link>

        <nav className="mt-8 space-y-1">
          {primaryNav.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "tv-focus flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
                  active
                    ? "bg-white text-brand shadow-sm ring-1 ring-line"
                    : "text-muted hover:bg-white hover:text-fg",
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Download size={18} />
          </div>
          <p className="mt-3 text-sm font-bold">PinFlix apps</p>
          <p className="mt-1 text-xs leading-5 text-muted">Mobile, TV and desktop apps are being prepared.</p>
          <span className="mt-3 inline-flex rounded-full bg-elevated px-2.5 py-1 text-[11px] font-semibold text-muted">Coming soon</span>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="tv-focus flex min-h-11 shrink-0 items-center gap-2 rounded-xl lg:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-xs font-black text-white">P</span>
              <span className="font-black">PinFlix</span>
            </Link>

            <Link
              href="/search"
              className="tv-focus mx-auto flex h-11 min-w-0 max-w-2xl flex-1 items-center gap-3 rounded-xl bg-slate-100 px-4 text-sm text-muted hover:bg-slate-200/70"
              aria-label="Search movies and web series"
            >
              <Search size={18} />
              <span className="truncate">Search movies, web series, genres…</span>
            </Link>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-muted">
                <Sparkles size={15} className="text-brand" />
                Fresh catalog
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-white/96 px-2 pb-[calc(env(safe-area-inset-bottom)+.45rem)] pt-2 backdrop-blur-xl lg:hidden">
        {primaryNav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "tv-focus flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-semibold",
                active ? "text-brand" : "text-muted",
              )}
            >
              <Icon size={19} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="h-20 lg:hidden" />
    </div>
  );
}
