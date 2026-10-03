const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export type TMDBImageSize = "w185" | "w300" | "w342" | "w500" | "w780" | "original";

export function getTMDBImageUrl(
  path: string | null | undefined,
  size: TMDBImageSize = "w500",
): string | null {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null;
}
