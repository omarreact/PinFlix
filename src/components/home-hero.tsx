import Link from "next/link";
import { Info, Play, Search } from "lucide-react";
import { SavedToggle } from "@/src/components/saved-toggle";
import { getTMDBImageUrl } from "@/src/lib/tmdb/images";
import { getMediaTitle, getMediaType, getMediaYear, type TMDBMedia } from "@/src/lib/tmdb/types";
import type { Entertainment } from "@/src/types/catalog";

export function HomeHero({ item, discovery }: { item?: Entertainment; discovery?: TMDBMedia }) {
  const discoveryTitle = discovery ? getMediaTitle(discovery) : "";
  const discoveryImage = discovery
    ? getTMDBImageUrl(discovery.backdrop_path || discovery.poster_path, "original") || ""
    : "";
  const image = item?.backdrop || item?.poster || discoveryImage;
  const title = item?.title || discoveryTitle || "Cinematic streaming, beautifully simplified";
  const overview = item?.synopsis || discovery?.overview || "Discover movies and series through a fast, cinematic interface with a playback layer kept separate from catalog metadata.";
  const year = item?.year ? String(item.year) : discovery ? getMediaYear(discovery) : "";
  const kind = item?.kind || (discovery ? getMediaType(discovery) : undefined);

  return (
    <section className="relative flex min-h-[78vh] items-end overflow-hidden md:min-h-[86vh]">
      {image ? (
        <img src={image} alt="" className="hero-media absolute inset-0 h-full w-full scale-[1.025] object-cover object-center opacity-60" />
      ) : (
        <div className="poster-fallback absolute inset-0" />
      )}
      <div className="ambient-glow ambient-pulse left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="hero-vignette absolute inset-0" />
      <div className="hero-side-fade absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-40 md:px-12 md:pb-24">
        <div className="max-w-3xl animate-slide-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-brand shadow-[0_0_14px_rgba(168,85,247,.9)]" />
            <span className="text-[11px] font-bold uppercase tracking-[.18em] text-zinc-300">
              {item ? "Featured premiere" : discovery ? "TMDB discovery" : "PinFlix"}
            </span>
          </div>

          <h1 className="text-gradient max-w-3xl text-5xl font-black leading-[.95] tracking-[-.055em] sm:text-6xl md:text-7xl lg:text-8xl">
            {title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-300">
            {year && <span>{year}</span>}
            {item?.genres.slice(0, 3).map((genre) => (
              <span key={genre} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">{genre}</span>
            ))}
            {kind && (
              <span className="rounded-full border border-brand/30 bg-brand/15 px-3 py-1 font-bold text-accent">
                {kind === "show" || kind === "tv" ? "Series" : "Movie"}
              </span>
            )}
          </div>

          <p className="mt-5 max-w-2xl text-base font-light leading-7 text-zinc-300 md:text-lg">
            {overview}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {item ? (
              <>
                <Link
                  href={`/watch/${item.id}`}
                  className="tv-focus accent-gradient inline-flex min-h-12 items-center gap-2 rounded-full px-7 py-3 font-bold text-white shadow-[0_0_30px_rgba(168,85,247,.22)] hover:shadow-[0_0_38px_rgba(168,85,247,.46)]"
                >
                  <Play size={18} fill="currentColor" />
                  Watch now
                </Link>
                <SavedToggle
                  item={{
                    id: item.id,
                    slug: item.slug,
                    title: item.title,
                    kind: item.kind,
                    poster: item.poster,
                    year: item.year,
                    genres: item.genres,
                  }}
                />
                <Link
                  href={`/entertainment/${item.id}`}
                  className="tv-focus inline-flex min-h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/10"
                >
                  <Info size={18} />
                  Details
                </Link>
              </>
            ) : discovery ? (
              <>
                <Link
                  href={`/entertainment/tmdb-${getMediaType(discovery)}-${discovery.id}`}
                  className="tv-focus accent-gradient inline-flex min-h-12 items-center gap-2 rounded-full px-7 py-3 font-bold text-white"
                >
                  <Info size={18} />
                  Details
                </Link>
                <Link
                  href={`/search?q=${encodeURIComponent(discoveryTitle)}`}
                  className="tv-focus inline-flex min-h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-7 py-3 font-semibold"
                >
                  <Search size={18} />
                  Search PinFlix
                </Link>
              </>
            ) : (
              <>
                <Link href="/movies" className="tv-focus accent-gradient rounded-full px-7 py-3 font-bold text-white">Browse movies</Link>
                <Link href="/series" className="tv-focus rounded-full border border-white/10 bg-white/5 px-7 py-3 font-semibold">Browse series</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
