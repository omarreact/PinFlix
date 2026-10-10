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
            "media-focus shrink-0 rounded-md border px-4 py-2.5 text-xs font-semibold",
            current === tab.id
              ? "border-brand bg-brand text-bg"
              : "border-line bg-surface text-muted hover:bg-white/10 hover:text-white",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
