import type { TMDBMedia } from "@/src/lib/tmdb/types";
import { TMDBMediaCard } from "./media-card";

export function TMDBMediaGrid({ items }: { items: TMDBMedia[] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-6">
      {items.map((media) => (
        <TMDBMediaCard key={`${media.media_type ?? "media"}-${media.id}`} media={media} />
      ))}
    </div>
  );
}
