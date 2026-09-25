import type { Entertainment } from "@/src/types/catalog";
import { tmdbImage } from "./api";

export type TmdbGenre = { id: number; name: string };

export type TmdbMovie = {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  genres?: TmdbGenre[];
};

export type TmdbTv = {
  id: number;
  name: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  genres?: TmdbGenre[];
  number_of_episodes?: number;
};

export type TmdbPaged<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

const movieGenreCache = new Map<number, string>();
const tvGenreCache = new Map<number, string>();

export function seedGenreMaps(movieGenres: TmdbGenre[], tvGenres: TmdbGenre[]) {
  for (const g of movieGenres) movieGenreCache.set(g.id, g.name);
  for (const g of tvGenres) tvGenreCache.set(g.id, g.name);
}

function resolveGenres(ids: number[] | undefined, kind: "movie" | "show", embedded?: TmdbGenre[]) {
  if (embedded?.length) return embedded.map((g) => g.name);
  const cache = kind === "movie" ? movieGenreCache : tvGenreCache;
  return (ids ?? []).map((id) => cache.get(id)).filter(Boolean) as string[];
}

function yearFromDate(date?: string) {
  if (!date || date.length < 4) return undefined;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}

export function mapMovie(m: TmdbMovie): Entertainment {
  return {
    id: `tmdb-movie-${m.id}`,
    slug: `tmdb-movie-${m.id}`,
    title: m.title,
    kind: "movie",
    year: yearFromDate(m.release_date),
    rating: typeof m.vote_average === "number" ? Math.round(m.vote_average * 10) / 10 : undefined,
    genres: resolveGenres(m.genre_ids, "movie", m.genres),
    backdrop: tmdbImage(m.backdrop_path, "w1280"),
    poster: tmdbImage(m.poster_path, "w500"),
    synopsis: m.overview?.trim() || "",
    provider: "tmdb",
    providerId: String(m.id),
  };
}

export function mapTv(t: TmdbTv): Entertainment {
  return {
    id: `tmdb-tv-${t.id}`,
    slug: `tmdb-tv-${t.id}`,
    title: t.name,
    kind: "show",
    year: yearFromDate(t.first_air_date),
    rating: typeof t.vote_average === "number" ? Math.round(t.vote_average * 10) / 10 : undefined,
    genres: resolveGenres(t.genre_ids, "show", t.genres),
    backdrop: tmdbImage(t.backdrop_path, "w1280"),
    poster: tmdbImage(t.poster_path, "w500"),
    synopsis: t.overview?.trim() || "",
    episodes: t.number_of_episodes,
    provider: "tmdb",
    providerId: String(t.id),
  };
}

export function parseTmdbSlug(slug: string): { kind: "movie" | "tv"; id: number } | null {
  const movie = /^tmdb-movie-(\d+)$/.exec(slug);
  if (movie) return { kind: "movie", id: Number(movie[1]) };
  const tv = /^tmdb-tv-(\d+)$/.exec(slug);
  if (tv) return { kind: "tv", id: Number(tv[1]) };
  return null;
}
