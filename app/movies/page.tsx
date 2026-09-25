import Link from "next/link";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { TmdbGenreNav } from "@/src/components/tmdb-genre-nav";
import { entertainment as staticEntertainment } from "@/src/lib/iptv/catalog";
import * as tmdb from "@/src/lib/providers/tmdb";

type SearchParams = Promise<{
  genre?: string;
  page?: string;
}>;

export default async function MoviesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const genreId = params.genre ? Number.parseInt(params.genre, 10) : undefined;
  const configured = tmdb.isTmdbConfigured();

  const genres = configured ? await tmdb.getMovieGenres() : [];
  const activeGenre = genreId && Number.isFinite(genreId)
    ? genres.find((g) => g.tmdbId === genreId)
    : undefined;

  const catalog = configured
    ? activeGenre
      ? await tmdb.discoverMovies({ page, genreId: activeGenre.tmdbId })
      : await tmdb.getPopularMovies(page)
    : {
        items: staticEntertainment.filter((item) => item.kind === "movie"),
        page: 1,
        totalPages: 1,
      };

  const items = catalog.items;
  const hasNext = catalog.page < catalog.totalPages;
  const title = activeGenre?.label ?? "Popular movies";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Movies</p>
        <h1 className="mt-2 text-3xl font-black">{title}</h1>
        <p className="mt-2 text-muted">
          {configured
            ? "Catalog powered by TMDB. Trailers and details only — full films need a licensed source."
            : "Set TMDB_ACCESS_TOKEN or TMDB_API_KEY on Vercel to load the live movie catalog. Showing demo titles for now."}
        </p>
      </div>

      <TmdbGenreNav genres={genres} activeId={activeGenre ? String(activeGenre.tmdbId) : undefined} basePath="/movies" />

      {items.length > 0 ? (
        <EntertainmentGrid items={items} />
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-6 text-muted">
          No movies were returned. {configured ? "Try another genre or page." : "Add a TMDB API key to enable the catalog."}
        </div>
      )}

      {configured && (page > 1 || hasNext) && (
        <div className="flex items-center justify-between border-t border-line pt-5">
          <div>
            {page > 1 && (
              <Link
                className="tv-focus rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold"
                href={`/movies?${new URLSearchParams({
                  ...(activeGenre ? { genre: String(activeGenre.tmdbId) } : {}),
                  page: String(page - 1),
                }).toString()}`}
              >
                ← Previous
              </Link>
            )}
          </div>
          <span className="text-sm text-muted">
            Page {catalog.page} / {catalog.totalPages}
          </span>
          <div>
            {hasNext && (
              <Link
                className="tv-focus rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold"
                href={`/movies?${new URLSearchParams({
                  ...(activeGenre ? { genre: String(activeGenre.tmdbId) } : {}),
                  page: String(page + 1),
                }).toString()}`}
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}

      {configured && (
        <p className="text-center text-xs text-subtle">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      )}
    </div>
  );
}
