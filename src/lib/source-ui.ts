import type { Entertainment } from "@/src/types/catalog";
import type { SavedTitle } from "@/src/lib/saved";

/** Presentation adapter only: retain the provider-issued ID and existing routes. */
export type Title = {
  id: string;
  title: string;
  kind: "movie" | "series";
  poster: string | null;
  backdrop: string | null;
  year: number | null;
  category: string;
  language: string | null;
  quality: string | null;
  synopsis: string;
  genres: string[];
};
export type Category = {
  name: string;
  kind: "movie" | "series";
  mature: boolean;
};
export type Catalogue = {
  items: Title[];
  categories: Category[];
  years: number[];
  hasNext: boolean;
  page: number;
  stale: boolean;
  retrievedAt: string;
  notice?: string;
};
export function toTitle(item: SavedTitle | Entertainment): Title {
  const details = item as Partial<Entertainment>;
  return {
    id: item.id,
    title: item.title,
    kind: item.kind === "show" ? "series" : "movie",
    poster: item.poster || null,
    backdrop: details.backdrop || null,
    year: item.year ?? null,
    category:
      details.category ||
      item.genres?.[0] ||
      (item.kind === "show" ? "Series" : "Movie"),
    language: details.languages?.join(" · ") || null,
    quality: details.resolutions?.length
      ? Math.max(...details.resolutions) >= 2160
        ? "4K"
        : `${Math.max(...details.resolutions)}P`
      : null,
    synopsis: details.synopsis || "",
    genres: item.genres ?? [],
  };
}
export function toSavedTitle(title: Title): SavedTitle {
  return {
    id: title.id,
    slug: title.id,
    title: title.title,
    kind: title.kind === "series" ? "show" : "movie",
    poster: title.poster ?? undefined,
    year: title.year ?? undefined,
    genres: title.genres,
  };
}
export function titleHref(title: Pick<Title, "id">) {
  const tmdb = title.id.match(/^tmdb-(movie|tv)-(\d+)$/);
  return tmdb
    ? `/title/${tmdb[1]}/${tmdb[2]}`
    : `/entertainment/${encodeURIComponent(title.id)}`;
}
export const api = (path: string) => `/api/ui${path}`;
