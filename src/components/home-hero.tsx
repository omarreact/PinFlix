import Link from "next/link";
import { Info, Play } from "lucide-react";
import { SavedToggle } from "@/src/components/saved-toggle";
import type { Entertainment } from "@/src/types/catalog";

export function HomeHero({ item }: { item?: Entertainment }) {
  const image = item?.backdrop || item?.poster || "";
  const title = item?.title || "Cinematic discovery, beautifully simplified";
  const overview = item?.synopsis || "Discover movies and TV series through PinFlix with metadata supplied by TMDB.";
  const year = item?.year ? String(item.year) : "";
  const kind = item?.kind;
  const isTmdb = item?.provider === "tmdb" && item.providerId;
  const detailHref = item
    ? isTmdb
      ? \`/title/\${item.kind === "show" ? "tv" : "movie"}/\${item.providerId}\`
      : \`/entertainment/\${item.id}\`
    : "/movies";
  const primaryHref = item && !isTmdb ? \`/watch/\${item.id}\` : detailHref;

  return (
    <section className="relative flex min-h-[78vh] items-end overflow-hidden md:min-h-[86vh]">
      {image ? (
        <img src={image} alt="" loading="eager" fetchPriority="high" decoding="async" className="hero-media absolute inset-0 h-full w-full scale-[1.025] object-cover object-center opacity-60" />
      ) : (
        <div className="poster-fallback absolute inset-0" />
      )}
      <div className="ambient-glow ambient-pulse left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="hero-vignette absolute inset-0" />
      <div className="hero-side-fade absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-40 md:px-12 md:pb-24">
        <div className="max-w-3xl animate-slide-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-brand shadow-[0_0_14px_rgba(230,57,70,.9)]" />
            <span className="text-[11px] font-bold uppercase tracking-[.18em] text-zinc-300">{item ? "Trending on TMDB" : "PinFlix"}</span>
          </div>

          <h1 className="text-gradient max-w-3xl text-5xl font-black leading-[.95] tracking-[-.055em] sm:text-6xl md:text-7xl lg:text-8xl">{title}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-300">
            {year && <span>{year}</span>}
            {kind && <span className="rounded-full border border-brand/30 bg-brand/15 px-3 py-1 font-bold text-accent">{kind === "show" ? "Series" : "Movie"}</span>}
            {item?.rating != null && item.rating > 0 && <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 font-bold text-amber-200">★ {item.rating.toFixed(1)}</span>}
          </div>

          <p className="mt-5 max-w-2xl text-base font-light leading-7 text-zinc-300 md:text-lg">{overview}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {item ? (
              <>
                <Link href={primaryHref} className="media-focus accent-gradient inline-flex min-h-12 items-center gap-2 rounded-full px-7 py-3 font-bold text-white shadow-[0_0_30px_rgba(230,57,70,.35)]">
                  {isTmdb ? <Info size={18} /> : <Play size={18} fill="currentColor" />}
                  {isTmdb ? "View title" : "Watch now"}
                </Link>
                <SavedToggle item={{ id: item.id, slug: item.slug, title: item.title, kind: item.kind, poster: item.poster, year: item.year, genres: item.genres }} />
                <Link href={detailHref} className="media-focus inline-flex min-h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/10">
                  <Info size={18} />
                  Details
                </Link>
              </>
            ) : (
              <>
                <Link href="/movies" className="media-focus accent-gradient rounded-full px-7 py-3 font-bold text-white">Browse movies</Link>
                <Link href="/series" className="media-focus rounded-full border border-white/10 bg-white/5 px-7 py-3 font-semibold">Browse series</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
