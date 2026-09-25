"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";

const tabs = [
  { id: "all", label: "All", href: "/" },
  { id: "movies", label: "Movies", href: "/movies" },
  { id: "series", label: "TV Shows", href: "/series" },
  { id: "live", label: "Live TV", href: "/browse" },
];

export function BrowseTabs({ active }: { active?: string }) {
  const pathname = usePathname();
  const current =
    active ??
    (pathname.startsWith("/movies")
      ? "movies"
      : pathname.startsWith("/series")
        ? "series"
        : pathname.startsWith("/browse")
          ? "live"
          : "all");

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold tracking-tight md:text-2xl">Browse your way</h2>
      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const isActive = current === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "tv-focus whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition",
                isActive
                  ? "bg-white text-black"
                  : "bg-panel text-muted hover:bg-elevated hover:text-fg",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
