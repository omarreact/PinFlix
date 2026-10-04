import { tmdbFetch } from "./client";
import type { TMDBMedia, TMDBMovie, TMDBMovieDetails, TMDBPaginatedResponse, TMDBTVDetails, TMDBTVShow } from "./types";

export async function getTrendingMovies(timeWindow: "day" | "week" = "week") {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>(
    `/trending/movie/${timeWindow}`,
    { language: "en-US" },
    { revalidate: 1800 },
  );
}

export async function getTrendingTV(timeWindow: "day" | "week" = "week") {
  return tmdbFetch<TMDBPaginatedResponse<TMDBTVShow>>(
    `/trending/tv/${timeWindow}`,
    { language: "en-US" },
    { revalidate: 1800 },
  );
}

export async function getPopularMovies(page = 1) {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>(
    "/movie/popular",
    { language: "en-US", page: Math.max(1, Math.floor(page)) },
    { revalidate: 1800 },
  );
}

export async function getPopularTV(page = 1) {
  return tmdbFetch<TMDBPaginatedResponse<TMDBTVShow>>(
    "/tv/popular",
    { language: "en-US", page: Math.max(1, Math.floor(page)) },
    { revalidate: 1800 },
  );
}

type MultiSearchItem = TMDBMedia | { id: number; media_type: "person" };

export async function searchTMDB(query: string, page = 1): Promise<TMDBPaginatedResponse<TMDBMedia>> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return { page: 1, results: [], total_pages: 0, total_results: 0 };

  const response = await tmdbFetch<TMDBPaginatedResponse<MultiSearchItem>>(
    "/search/multi",
    { query: cleanQuery, page, include_adult: false, language: "en-US" },
    { cache: "no-store" },
  );

  const results = response.results.filter(
    (item): item is TMDBMedia => item.media_type === "movie" || item.media_type === "tv",
  );

  return { ...response, results };
}

export async function getMovieDetails(id: number) {
  return tmdbFetch<TMDBMovieDetails>(
    `/movie/${id}`,
    { language: "en-US" },
    { revalidate: 1800 },
  );
}

export async function getTVDetails(id: number) {
  return tmdbFetch<TMDBTVDetails>(
    `/tv/${id}`,
    { language: "en-US" },
    { revalidate: 1800 },
  );
}
