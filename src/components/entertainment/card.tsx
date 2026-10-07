import Link from "next/link";
import { PlayCircle } from "lucide-react";
import type { Entertainment } from "@/src/types/catalog";

export function EntertainmentCard({ item }: { item: Entertainment }) {
  const detailHref =
    item.provider === "tmdb" && item.providerId
      ? `/title/${item.kind === "show" ? "tv" : "movie"}/${item.providerId}`
      : `/entertainment/${item.id}`;

  return (
    <Link
      href={detailHref}
      className="movie-card media-focus group relative block aspect-[2/3] min-w-0 overflow-hidden rounded-2xl border border-white/5 bg-surface"
      aria-label={`View ${item.title}`}
    >
      {item.poster ? (
        <img src={item.poster} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
      ) : (
        <div className="poster-fallback grid h-full place-items-center p-5 text-center text-lg font-bold text-white/70">{item.title}</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/25 to-transparent opacity-75" />
      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-zinc-200 backdrop-blur-md">
          {item.kind === "show" ? "Series" : "Movie"}
        </span>
        {item.rating !== undefined && item.rating > 0 && (
          <span className="rounded-full border border-brand/30 bg-brand/20 px-2.5 py-1 text-[10px] font-bold text-accent backdrop-blur-md">★ {item.rating.toFixed(1)}</span>
        )}
      </div>
      <div className="meta-overlay absolute inset-0 flex flex-col justify-end p-4">
        <PlayCircle className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-2xl" size={50} fill="rgba(255,255,255,.15)" />
        <h3 className="line-clamp-2 text-sm font-bold leading-tight text-white drop-shadow-md sm:text-base">{item.title}</h3>
        <p className="mt-1.5 text-[11px] font-medium text-accent">
          {[item.year ? String(item.year) : "", item.provider === "tmdb" ? "TMDB" : item.genres[0] || ""].filter(Boolean).join(" · ") || "PinFlix"}
        </p>
      </div>
    </Link>
  );
}
