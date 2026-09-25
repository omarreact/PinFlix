import type { Entertainment } from "@/src/types/catalog";
import { isTmdbConfigured, tmdbFetch } from "./api";
import {
  mapMovie,
  mapTv,
  parseTmdbSlug,
  seedGenreMaps,
  type TmdbGenre,
  type TmdbMovie,
  type TmdbPaged,
  type TmdbTv,
} from "./map";

export { isTmdbConfigured, tmdbImage } from "./api";
export { parseTmdbSlug } from "./map";

let genresLoaded = false;

async function ensureGenres() {
  if (genresLoaded || !isTmdbConfigured()) return;
  try {
    const [movies, tv] = await Promise.all([
      tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list?language=en-US", 86_400),
      tmdbFetch<{ genres: TmdbGenre[] }>("/genre/tv/list?language=en-US", 86_400),
    ]);
    seedGenreMaps(movies.genres ?? [], tv.genres ?? []);
    genresLoaded = true;
  } catch (error) {
    console.warn("TMDB genre list unavailable", error);
  }
}

export type TmdbGenreOption = {
  id: string;
  tmdbId: number;
  label: string;
  kind: "movie" | "tv";
};

export async function getMovieGenres(): Promise<TmdbGenreOption[]> {
  if (!isTmdbConfigured()) return [];
  try {
    const data = await tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list?language=en-US", 86_400);
    return (data.genres ?? []).map((g) => ({
      id: `tmdb-genre-movie-${g.id}`,
      tmdbId: g.id,
      label: g.name,
      kind: "movie" as const,
    }));
  } catch (error) {
    console.error("TMDB getMovieGenres", error);
    return [];
  }
}

export async function getTvGenres(): Promise<TmdbGenreOption[]> {
  if (!isTmdbConfigured()) return [];
  try {
    const data = await tmdbFetch<{ genres: TmdbGenre[] }>("/genre/tv/list?language=en-US", 86_400);
    return (data.genres ?? []).map((g) => ({
      id: `tmdb-genre-tv-${g.id}`,
      tmdbId: g.id,
      label: g.name,
      kind: "tv" as const,
    }));
  } catch (error) {
    console.error("TMDB getTvGenres", error);
    return [];
  }
}

export async function getPopularMovies(page = 1): Promise<{ items: Entertainment[]; page: number; totalPages: number }> {
  if (!isTmdbConfigured()) return { items: [], page: 1, totalPages: 1 };
  await ensureGenres();
  try {
    const data = await tmdbFetch<TmdbPaged<TmdbMovie>>(
      `/movie/popular?language=en-US&page=${Math.max(1, page)}`,
      3600,
    );
    return {
      items: (data.results ?? []).map(mapMovie),
      page: data.page ?? page,
      totalPages: data.total_pages ?? 1,
    };
  } catch (error) {
    console.error("TMDB getPopularMovies", error);
    return { items: [], page: 1, totalPages: 1 };
  }
}

export async function getPopularTv(page = 1): Promise<{ items: Entertainment[]; page: number; totalPages: number }> {
  if (!isTmdbConfigured()) return { items: [], page: 1, totalPages: 1 };
  await ensureGenres();
  try {
    const data = await tmdbFetch<TmdbPaged<TmdbTv>>(
      `/tv/popular?language=en-US&page=${Math.max(1, page)}`,
      3600,
    );
    return {
      items: (data.results ?? []).map(mapTv),
      page: data.page ?? page,
      totalPages: data.total_pages ?? 1,
    };
  } catch (error) {
    console.error("TMDB getPopularTv", error);
    return { items: [], page: 1, totalPages: 1 };
  }
}

export async function discoverMovies(options: {
  page?: number;
  genreId?: number;
}): Promise<{ items: Entertainment[]; page: number; totalPages: number }> {
  if (!isTmdbConfigured()) return { items: [], page: 1, totalPages: 1 };
  await ensureGenres();
  const page = Math.max(1, options.page ?? 1);
  const params = new URLSearchParams({
    language: "en-US",
    sort_by: "popularity.desc",
    include_adult: "false",
    page: String(page),
  });
  if (options.genreId) params.set("with_genres", String(options.genreId));

  try {
    const data = await tmdbFetch<TmdbPaged<TmdbMovie>>(`/discover/movie?${params}`, 3600);
    return {
      items: (data.results ?? []).map(mapMovie),
      page: data.page ?? page,
      totalPages: data.total_pages ?? 1,
    };
  } catch (error) {
    console.error("TMDB discoverMovies", error);
    return { items: [], page: 1, totalPages: 1 };
  }
}

export async function discoverTv(options: {
  page?: number;
  genreId?: number;
}): Promise<{ items: Entertainment[]; page: number; totalPages: number }> {
  if (!isTmdbConfigured()) return { items: [], page: 1, totalPages: 1 };
  await ensureGenres();
  const page = Math.max(1, options.page ?? 1);
  const params = new URLSearchParams({
    language: "en-US",
    sort_by: "popularity.desc",
    include_adult: "false",
    page: String(page),
  });
  if (options.genreId) params.set("with_genres", String(options.genreId));

  try {
    const data = await tmdbFetch<TmdbPaged<TmdbTv>>(`/discover/tv?${params}`, 3600);
    return {
      items: (data.results ?? []).map(mapTv),
      page: data.page ?? page,
      totalPages: data.total_pages ?? 1,
    };
  } catch (error) {
    console.error("TMDB discoverTv", error);
    return { items: [], page: 1, totalPages: 1 };
  }
}

export async function search(query: string, page = 1): Promise<Entertainment[]> {
  if (!isTmdbConfigured()) return [];
  const q = query.trim();
  if (!q) return [];
  await ensureGenres();

  try {
    const data = await tmdbFetch<{
      results: Array<(TmdbMovie | TmdbTv) & { media_type?: string; title?: string; name?: string }>;
    }>(`/search/multi?language=en-US&include_adult=false&query=${encodeURIComponent(q)}&page=${Math.max(1, page)}`, 900);

    return (data.results ?? [])
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .map((item) => {
        if (item.media_type === "tv" || ("name" in item && item.name && !("title" in item && item.title))) {
          return mapTv(item as TmdbTv);
        }
        return mapMovie(item as TmdbMovie);
      });
  } catch (error) {
    console.error("TMDB search", error);
    return [];
  }
}

export async function getDetails(slugOrId: string): Promise<Entertainment | null> {
  if (!isTmdbConfigured()) return null;
  const parsed = parseTmdbSlug(slugOrId) ?? (
    /^\d+$/.test(slugOrId) ? { kind: "movie" as const, id: Number(slugOrId) } : null
  );
  if (!parsed) return null;

  try {
    if (parsed.kind === "movie") {
      const data = await tmdbFetch<TmdbMovie>(`/movie/${parsed.id}?language=en-US`, 86_400);
      return mapMovie(data);
    }
    const data = await tmdbFetch<TmdbTv>(`/tv/${parsed.id}?language=en-US`, 86_400);
    return mapTv(data);
  } catch (error) {
    console.error("TMDB getDetails", error);
    return null;
  }
}
