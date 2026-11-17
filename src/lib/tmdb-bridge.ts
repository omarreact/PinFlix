import "server-only";

import { catalogProvider } from "@/src/lib/providers/catalog";
import { tmdbFetch, tmdbItemToEntertainment } from "@/src/lib/tmdb";
import { firstExactMatch } from "@/src/lib/title-match-utils";
import type { Entertainment } from "@/src/types/catalog";

type TmdbSearchItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
};

export async function lookupTmdbMetadata(item: Entertainment): Promise<Entertainment | null> {
  if (!process.env.TMDB_READ_ACCESS_TOKEN?.trim() && !process.env.TMDB_API_KEY?.trim()) return null;
  const type = item.kind === "show" ? "tv" : "movie";
  try {
    const response = await tmdbFetch<{ results: TmdbSearchItem[] }>(
      `/search/${type}`,
      { query: item.title, language: "en-US", include_adult: false },
      3600,
    );
    const candidates = (response.results ?? []).slice(0, 15)
      .map(result => tmdbItemToEntertainment(result, type));
    return firstExactMatch(item, candidates);
  } catch {
    // Discovery and playback must remain available when TMDB is slow or offline.
    return null;
  }
}

export async function findPlayableProviderMatch(title: Pick<Entertainment, "title" | "kind" | "year">): Promise<Entertainment | null> {
  try {
    const candidates = await catalogProvider.search(title.title, 1);
    return firstExactMatch(title, candidates);
  } catch {
    return null;
  }
}
