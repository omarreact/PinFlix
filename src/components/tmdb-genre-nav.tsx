import Link from "next/link";
import type { TmdbGenreOption } from "@/src/lib/providers/tmdb";

export function TmdbGenreNav({
  genres,
  activeId,
  basePath,
}: {
  genres: TmdbGenreOption[];
  activeId?: string;
  basePath: "/movies" | "/series";
}) {
  if (!genres.length) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-black uppercase tracking-[.18em] text-brand">Genres</h2>
      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
        <Link
          href={basePath}
          className={`tv-focus whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition ${
            !activeId ? "border-brand bg-brand text-black" : "border-line bg-surface text-muted hover:text-fg"
          }`}
        >
          Popular
        </Link>
        {genres.map((genre) => (
          <Link
            key={genre.id}
            href={`${basePath}?genre=${genre.tmdbId}`}
            className={`tv-focus whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              activeId === String(genre.tmdbId)
                ? "border-brand bg-brand text-black"
                : "border-line bg-surface text-muted hover:text-fg"
            }`}
          >
            {genre.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
