"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";

const tabs = [
  { id: "all", label: "Discover", href: "/" },
  { id: "movies", label: "Movies", href: "/movies" },
  { id: "series", label: "Series", href: "/series" },
  { id: "saved", label: "My List", href: "/saved" },
];

export function BrowseTabs({ active }: { active?: string }) {
  const pathname = usePathname();
  const current =
    active ??
    (pathname.startsWith("/movies")
      ? "movies"
      : pathname.startsWith("/series")
        ? "series"
        : pathname.startsWith("/saved")
          ? "saved"
          : "all");

  return (
    <div className="hide-scrollbar flex gap-2 overflow-x-auto py-1">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={cn(
            "tv-focus shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold",
            current === tab.id
              ? "border-transparent accent-gradient text-white shadow-[0_0_18px_rgba(168,85,247,.22)]"
              : "border-white/5 bg-surface/70 text-zinc-400 hover:bg-white/10 hover:text-white",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
