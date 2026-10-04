import Link from "next/link";
import type { ProviderCategory } from "@/src/lib/providers/contracts";

const groupLabels: Record<string, string> = {
  movies: "Movies",
  series: "Series",
  "hindi-dubbed": "Hindi Dubbed",
  "animations-shows": "Animations & Shows",
  "regional-special": "Regional & Special",
  "web-series-sports": "Web Series & Sports",
  "top-watch": "Popular",
};

export function ProviderCategoryNav({
  categories,
  activeId,
  basePath,
}: {
  categories: ProviderCategory[];
  activeId?: string;
  basePath: "/movies" | "/series";
}) {
  const grouped = new Map<string, ProviderCategory[]>();
  for (const category of categories) {
    const current = grouped.get(category.group) ?? [];
    current.push(category);
    grouped.set(category.group, current);
  }

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([group, items]) => (
        <section key={group}>
          <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[.2em] text-zinc-500">
            {groupLabels[group] ?? group}
          </h2>
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
            {items.map((category) => (
              <Link
                key={category.id}
                href={basePath + "?category=" + encodeURIComponent(category.id)}
                className={`tv-focus shrink-0 whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                  activeId === category.id
                    ? "border-transparent accent-gradient text-white shadow-[0_0_20px_rgba(168,85,247,.25)]"
                    : "border-white/5 bg-surface/70 text-zinc-400 hover:border-white/15 hover:bg-white/10 hover:text-white"
                }`}
              >
                {category.label}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
