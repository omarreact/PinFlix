import Link from "next/link";
import type { CineplexCategory } from "@/src/lib/providers/cineplexbd";

const groupLabels: Record<string, string> = {
  movies: "Movies",
  "hindi-dubbed": "Hindi Dubbed",
  "animations-shows": "Animations & Shows",
  "regional-special": "Regional & Special",
  "web-series-sports": "Web Series & Sports",
  "top-watch": "Top Watch",
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

  return <div className="space-y-5">
    {[...grouped.entries()].map(([group, items]) => <section key={group} className="space-y-2">
      <h2 className="text-xs font-black uppercase tracking-[.18em] text-brand">{groupLabels[group] ?? group}</h2>
      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
        {items.map((category) => <Link
          key={category.id}
          href={`${basePath}?provider=cineplexbd&category=${encodeURIComponent(category.id)}`}
          className={`tv-focus whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition ${activeId === category.id ? "border-brand bg-brand text-black" : "border-line bg-surface text-muted hover:text-fg"}`}
        >{category.label}</Link>)}
      </div>
    </section>)}
  </div>;
}
