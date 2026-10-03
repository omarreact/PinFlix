import Image from "next/image";
import { Star } from "lucide-react";
import { getTMDBImageUrl } from "@/src/lib/tmdb/images";
import { getMediaTitle, getMediaType, getMediaYear, type TMDBMedia } from "@/src/lib/tmdb/types";

export function TMDBMediaCard({ media, priority = false }: { media: TMDBMedia; priority?: boolean }) {
  const title = getMediaTitle(media);
  const poster = getTMDBImageUrl(media.poster_path);
  const type = getMediaType(media);

  return (
    <article className="group min-w-0">
      <div className="movie-card relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/5 bg-surface">
        {poster ? (
          <Image
            src={poster}
            alt={`${title} poster`}
            fill
            priority={priority}
            sizes="(max-width:640px) 46vw,(max-width:1024px) 29vw,(max-width:1280px) 21vw,16vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="poster-fallback flex h-full items-center justify-center px-4 text-center text-sm text-zinc-400">
            {title}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-70" />
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-xs font-bold text-white backdrop-blur">
          <Star size={12} fill="currentColor" className="text-warning" />
          {media.vote_average ? media.vote_average.toFixed(1) : "NR"}
        </div>
        <div className="meta-overlay absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-3 text-xs leading-5 text-zinc-300">{media.overview || "TMDB metadata"}</p>
        </div>
      </div>
      <div className="mt-3">
        <h3 className="truncate text-sm font-bold text-white">{title}</h3>
        <p className="mt-1 text-xs text-zinc-500">{getMediaYear(media)} · {type === "tv" ? "Series" : "Movie"}</p>
      </div>
    </article>
  );
}
