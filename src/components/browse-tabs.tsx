"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";

const tabs = [
  { id: "all", label: "Discover", href: "/" },
  { id: "movies", label: "Movies", href: "/movies" },
  { id: "series", label: "Web Series", href: "/series" },
];

export function BrowseTabs({ active }: { active?: string }) {
  const pathname = usePathname();
  const current =
    active ??
    (pathname.startsWith("/movies")
      ? "movies"
      : pathname.startsWith("/series")
        ? "series"
        : "all");

  return (
    <section>
      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const isActive = current === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "tv-focus whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-semibold shadow-sm",
                isActive
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950",
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
