export type TMDBMediaType = "movie" | "tv";

export interface TMDBBaseMedia {
  id: number;
  adult: boolean;
  backdrop_path: string | null;
  poster_path: string | null;
  genre_ids: number[];
  original_language: string;
  overview: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  media_type?: TMDBMediaType;
}

export interface TMDBMovie extends TMDBBaseMedia {
  media_type?: "movie";
  title: string;
  original_title: string;
  release_date: string;
  video: boolean;
}

export interface TMDBTVShow extends TMDBBaseMedia {
  media_type?: "tv";
  name: string;
  original_name: string;
  first_air_date: string;
  origin_country: string[];
}

export type TMDBMedia = TMDBMovie | TMDBTVShow;

export interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export function getMediaType(media: TMDBMedia): TMDBMediaType {
  return media.media_type ?? ("title" in media ? "movie" : "tv");
}

export function getMediaTitle(media: TMDBMedia): string {
  return "title" in media ? media.title : media.name;
}

export function getMediaDate(media: TMDBMedia): string {
  return "release_date" in media ? media.release_date : media.first_air_date;
}

export function getMediaYear(media: TMDBMedia): string {
  return getMediaDate(media)?.slice(0, 4) || "—";
}
