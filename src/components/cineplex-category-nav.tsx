import Link from "next/link";
import type { CineplexCategory } from "@/src/lib/providers/cineplexbd";

const groupLabels: Record<string, string> = {
  movies: "Movies",
  "hindi-dubbed": "Hindi Dubbed",
  "animations-shows": "Animations & Shows",
  "regional-special": "Regional & Special",
  "web-series-sports": "Web Series & Sports",
  "top-watch": "Popular",
};

export function CineplexCategoryNav({
  categories,
  activeId,
  basePath,
}: {
  categories: CineplexCategory[];
  activeId?: string;
  basePath: "/movies" | "/series";
}) {
  const grouped = new Map<string, CineplexCategory[]>();
  for (const category of categories) {
    const current = grouped.get(category.group) ?? [];
    current.push(category);
    grouped.set(category.group, current);
  }

  return (
    <div className="space-y-5">
      {[...grouped.entries()].map(([group, items]) => (
        <section key={group} className="space-y-2.5">
          <h2 className="text-xs font-extrabold uppercase tracking-[.18em] text-slate-500">
            {groupLabels[group] ?? group}
          </h2>
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
            {items.map((category) => (
              <Link
                key={category.id}
                href={`${basePath}?category=${encodeURIComponent(category.id)}`}
                className={`tv-focus whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold shadow-sm ${
                  activeId === category.id
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
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
