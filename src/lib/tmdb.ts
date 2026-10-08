import "server-only";

import { catalogProvider } from "@/src/lib/providers/catalog";
import type { Entertainment } from "@/src/types/catalog";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

type TmdbMediaType = "movie" | "tv";

type TmdbListItem = {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
};

type TmdbGenre = { id: number; name: string };
type TmdbCast = { name: string; character?: string };
type TmdbCredits = { cast?: TmdbCast[] };

export type TmdbTitleDetails = {
  id: number;
  mediaType: TmdbMediaType;
  title: string;
  originalTitle?: string;
  overview: string;
  year?: number;
  poster: string;
  backdrop: string;
  rating?: number;
  ratingCount?: number;
  genres: string[];
  runtimeMinutes?: number;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  cast: Array<{ name: string; role?: string }>;
};

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  revalidate = 300,
): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  const apiKey = process.env.TMDB_API_KEY?.trim();

  if (!token && !apiKey) {
    throw new Error("TMDB credentials are not configured");
  }

  if (!token && apiKey) url.searchParams.set("api_key", apiKey);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`TMDB ${path} returned HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function image(path: string | null | undefined, size: string) {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : "";
}

function yearFrom(value?: string) {
  const year = value ? Number(value.slice(0, 4)) : NaN;
  return Number.isInteger(year) && year > 1800 ? year : undefined;
}

export function tmdbItemToEntertainment(
  item: TmdbListItem,
  mediaType: TmdbMediaType,
): Entertainment {
  const title = mediaType === "movie" ? item.title : item.name;
  const release = mediaType === "movie" ? item.release_date : item.first_air_date;

  return {
    id: `tmdb-${mediaType}-${item.id}`,
    slug: `tmdb-${mediaType}-${item.id}`,
    title: title ?? "Untitled",
    kind: mediaType === "tv" ? "show" : "movie",
    year: yearFrom(release),
    rating: item.vote_average,
    ratingCount: item.vote_count,
    genres: [],
    backdrop: image(item.backdrop_path, "w1280"),
    poster: image(item.poster_path, "w500"),
    synopsis: item.overview ?? "",
    provider: "tmdb",
    providerId: String(item.id),
  };
}

export async function getTmdbTrending() {
  try {
    const data = await tmdbFetch<{ results: TmdbListItem[] }>(
      "/trending/all/day",
      { language: "en-US" },
      120,
    );

    return data.results
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .map((item) => tmdbItemToEntertainment(item, item.media_type as TmdbMediaType));
  } catch (error) {
    console.warn("TMDB trending unavailable; using MovieBox catalog instead.", error);
    const [movies, shows] = await Promise.all([
      catalogProvider.getLatestPage("movie"),
      catalogProvider.getLatestPage("show"),
    ]);
    return [...movies.items, ...shows.items];
  }
}

export async function getTmdbDiscover(mediaType: TmdbMediaType, page = 1) {
  try {
    const data = await tmdbFetch<{
      page: number;
      results: TmdbListItem[];
      total_pages: number;
    }>(
      `/discover/${mediaType}`,
      {
        language: "en-US",
        page,
        include_adult: false,
        sort_by: "popularity.desc",
      },
      300,
    );

    return {
      items: data.results.map((item) => tmdbItemToEntertainment(item, mediaType)),
      page: data.page,
      hasNextPage: data.page < Math.min(data.total_pages, 500),
    };
  } catch (error) {
    console.warn(`TMDB ${mediaType} catalog unavailable; using MovieBox catalog instead.`, error);
    return catalogProvider.getLatestPage(mediaType === "tv" ? "show" : "movie", page);
  }
}

export async function searchTmdb(query: string, page = 1) {
  try {
    const data = await tmdbFetch<{
      page: number;
      results: TmdbListItem[];
      total_pages: number;
      total_results: number;
    }>(
      "/search/multi",
      {
        query,
        page,
        include_adult: false,
        language: "en-US",
      },
      60,
    );

    const results = data.results
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .map((item) => tmdbItemToEntertainment(item, item.media_type as TmdbMediaType));

    return {
      page: data.page,
      results,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    };
  } catch (error) {
    console.warn("TMDB search unavailable; using MovieBox catalog instead.", error);
    const results = await catalogProvider.search(query, page);
    return {
      page,
      results,
      totalPages: results.length ? page : 0,
      totalResults: results.length,
    };
  }
}

export async function getTmdbDetails(
  mediaType: TmdbMediaType,
  id: number,
): Promise<TmdbTitleDetails> {
  const data = await tmdbFetch<{
    id: number;
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    overview?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average?: number;
    vote_count?: number;
    genres?: TmdbGenre[];
    runtime?: number;
    episode_run_time?: number[];
    number_of_seasons?: number;
    number_of_episodes?: number;
    credits?: TmdbCredits;
  }>(
    `/${mediaType}/${id}`,
    {
      language: "en-US",
      append_to_response: "credits",
    },
    300,
  );

  const release = mediaType === "movie" ? data.release_date : data.first_air_date;
  const runtime =
    mediaType === "movie"
      ? data.runtime
      : Array.isArray(data.episode_run_time) && data.episode_run_time.length
        ? data.episode_run_time[0]
        : undefined;

  return {
    id: data.id,
    mediaType,
    title: (mediaType === "movie" ? data.title : data.name) ?? "Untitled",
    originalTitle:
      (mediaType === "movie" ? data.original_title : data.original_name) ?? undefined,
    overview: data.overview ?? "",
    year: yearFrom(release),
    poster: image(data.poster_path, "w500"),
    backdrop: image(data.backdrop_path, "original"),
    rating: data.vote_average,
    ratingCount: data.vote_count,
    genres: data.genres?.map((genre) => genre.name) ?? [],
    runtimeMinutes: runtime,
    numberOfSeasons: data.number_of_seasons,
    numberOfEpisodes: data.number_of_episodes,
    cast:
      data.credits?.cast?.slice(0, 18).map((credit) => ({
        name: credit.name,
        role: credit.character,
      })) ?? [],
  };
}
