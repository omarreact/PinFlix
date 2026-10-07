import Link from "next/link";
import { notFound } from "next/navigation";
import { BookmarkPlus, CalendarDays, Clock3, Database, Star } from "lucide-react";
import { getTmdbDetails } from "@/src/lib/tmdb";
import { SavedToggle } from "@/src/components/saved-toggle";

export const revalidate = 300;

export default async function TmdbTitlePage({
  params,
}: {
  params: Promise<{ mediaType: string; tmdbId: string }>;
}) {
  const { mediaType, tmdbId } = await params;
  if (mediaType !== "movie" && mediaType !== "tv") notFound();

  const id = Number(tmdbId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let item;
  try {
    item = await getTmdbDetails(mediaType, id);
  } catch {
    notFound();
  }

  const kind = mediaType === "tv" ? "show" : "movie";
  const savedItem = {
    id: `tmdb-${mediaType}-${item.id}`,
    slug: `tmdb-${mediaType}-${item.id}`,
    title: item.title,
    kind: kind as "movie" | "show",
    poster: item.poster,
    year: item.year,
    genres: item.genres,
  };

  return (
    <div className="space-y-8">
      <Link href={mediaType === "tv" ? "/series" : "/movies"} className="tv-focus text-sm font-semibold text-zinc-400 hover:text-white">
        ← {mediaType === "tv" ? "Series" : "Movies"}
      </Link>

      <section className="relative min-h-[640px] overflow-hidden rounded-[30px] border border-white/10 bg-surface">
        {item.backdrop ? (
          <img src={item.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
        ) : (
          <div className="poster-fallback absolute inset-0" />
        )}
        <div className="hero-vignette absolute inset-0" />
        <div className="hero-side-fade absolute inset-0" />

        <div className="relative z-10 flex min-h-[640px] items-end p-6 sm:p-10 md:items-center md:p-12">
          <div className="grid w-full gap-8 md:grid-cols-[210px_minmax(0,1fr)] md:items-end">
            <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl md:block">
              {item.poster ? <img src={item.poster} alt="" className="aspect-[2/3] w-full object-cover" /> : <div className="poster-fallback aspect-[2/3]" />}
            </div>

            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[.15em] text-accent">
                <Database size={13} />
                TMDB metadata
              </div>

              <h1 className="text-gradient text-4xl font-black tracking-[-.05em] sm:text-5xl md:text-6xl">{item.title}</h1>

              <div className="mt-5 flex flex-wrap gap-2 text-sm text-zinc-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  {mediaType === "tv" ? "TV Series" : "Movie"}
                </span>
                {item.year && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"><CalendarDays size={14} />{item.year}</span>
                )}
                {item.rating !== undefined && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-amber-200"><Star size={14} fill="currentColor" />{item.rating.toFixed(1)}</span>
                )}
                {item.runtimeMinutes && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"><Clock3 size={14} />{item.runtimeMinutes} min</span>
                )}
              </div>

              {item.genres.length > 0 && (
                <p className="mt-4 text-sm font-medium text-zinc-400">{item.genres.join(" · ")}</p>
              )}

              {item.overview && (
                <p className="mt-5 max-w-2xl text-sm font-light leading-7 text-zinc-300 sm:text-base">{item.overview}</p>
              )}

              {mediaType === "tv" && (
                <p className="mt-4 text-sm text-zinc-400">
                  {[item.numberOfSeasons ? `${item.numberOfSeasons} seasons` : "", item.numberOfEpisodes ? `${item.numberOfEpisodes} episodes` : ""].filter(Boolean).join(" · ")}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <SavedToggle item={savedItem} />
                <div className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-zinc-400">
                  <BookmarkPlus size={17} />
                  Playback source not configured for this TMDB title
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {item.cast.length > 0 && (
        <section className="glass-panel rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white">Cast</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {item.cast.map((credit) => (
              <div key={`${credit.name}-${credit.role ?? ""}`} className="rounded-2xl border border-white/5 bg-white/[.03] p-4">
                <p className="font-semibold text-zinc-100">{credit.name}</p>
                {credit.role && <p className="mt-1 text-xs text-zinc-500">{credit.role}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
