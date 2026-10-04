import Link from "next/link";
import { notFound } from "next/navigation";
import { Languages, Play, Star, Users } from "lucide-react";
import { BackLink, EntertainmentRail } from "@/src/components/catalog-sections";
import { SavedToggle } from "@/src/components/saved-toggle";
import { catalogProvider } from "@/src/lib/providers/catalog";

export const dynamic = "force-dynamic";

export default async function EntertainmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!catalogProvider.canHandleId(slug)) notFound();

  const [item, recommendations] = await Promise.all([
    catalogProvider.getDetails(slug),
    catalogProvider.getRecommendations(slug, 1),
  ]);

  if (!item) notFound();

  const runtimeMinutes = item.durationSeconds
    ? Math.max(1, Math.round(item.durationSeconds / 60))
    : undefined;

  const metadata = [
    item.kind === "show" ? "Series" : "Movie",
    item.year !== undefined ? String(item.year) : "",
    item.rating !== undefined ? `★ ${item.rating}` : "",
    runtimeMinutes ? `${runtimeMinutes} min` : "",
    item.country ?? "",
    ...item.genres.slice(0, 4),
    item.episodes ? `${item.episodes} episodes` : "",
  ].filter(Boolean);

  return (
    <div className="space-y-10">
      <BackLink href={item.kind === "show" ? "/series" : "/movies"}>
        {item.kind === "show" ? "Series" : "Movies"}
      </BackLink>

      <section className="relative min-h-[620px] overflow-hidden rounded-[28px] border border-white/10 bg-surface">
        {item.backdrop && (
          <img
            src={item.backdrop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
        )}
        <div className="hero-vignette absolute inset-0" />
        <div className="hero-side-fade absolute inset-0" />

        <div className="relative z-10 flex min-h-[620px] items-end p-6 sm:p-10 md:items-center md:p-12">
          <div className="grid w-full gap-8 md:grid-cols-[180px_minmax(0,1fr)] md:items-end lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl md:block">
              {item.poster ? (
                <img
                  src={item.poster}
                  alt=""
                  className="aspect-[2/3] w-full object-cover"
                />
              ) : (
                <div className="poster-fallback aspect-[2/3] w-full" />
              )}
            </div>

            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-accent">
                MovieBox · {item.kind === "show" ? "Series" : "Movie"}
              </p>
              <h1 className="text-gradient mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl md:text-6xl">
                {item.title}
              </h1>

              {metadata.length > 0 && (
                <p className="mt-4 text-sm font-medium text-zinc-300">
                  {metadata.join(" · ")}
                </p>
              )}

              {item.ratingCount !== undefined && (
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-400">
                  <Star size={14} className="text-warning" />
                  {item.ratingCount.toLocaleString()} ratings
                </div>
              )}

              {item.synopsis && (
                <p className="mt-5 max-w-2xl text-sm font-light leading-7 text-zinc-300 sm:text-base">
                  {item.synopsis}
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {item.playable !== false ? (
                  <Link
                    href={`/watch/${item.id}`}
                    className="tv-focus accent-gradient inline-flex min-h-12 items-center gap-2 rounded-full px-7 py-3 font-bold text-white shadow-[0_0_30px_rgba(168,85,247,.22)]"
                  >
                    <Play size={18} fill="currentColor" />
                    Play
                  </Link>
                ) : (
                  <span className="inline-flex min-h-12 items-center rounded-full border border-white/10 bg-white/5 px-7 py-3 font-semibold text-zinc-400">
                    Coming soon
                  </span>
                )}

                {item.trailer?.url && (
                  <a
                    href={item.trailer.url}
                    target="_blank"
                    rel="noreferrer"
                    className="tv-focus inline-flex min-h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/10"
                  >
                    <Play size={17} />
                    Trailer
                  </a>
                )}

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
              </div>

              {item.qualities?.length ? (
                <p className="mt-4 text-xs text-zinc-500">
                  Available qualities: {item.qualities.join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {(item.languages?.length || item.dubs?.length || item.cast?.length) && (
        <section className="grid gap-5 lg:grid-cols-2">
          {(item.languages?.length || item.dubs?.length) && (
            <div className="glass-panel rounded-3xl p-6">
              <div className="flex items-center gap-2 text-accent">
                <Languages size={18} />
                <h2 className="font-bold text-white">Languages & versions</h2>
              </div>

              {item.languages?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.languages.map((language) => (
                    <span key={language} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300">
                      {language}
                    </span>
                  ))}
                </div>
              ) : null}

              {item.dubs?.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.dubs.map((dub) => (
                    <Link
                      key={dub.id}
                      href={`/entertainment/${dub.id}`}
                      className="tv-focus rounded-full border border-brand/20 bg-brand/10 px-4 py-2 text-xs font-bold text-accent hover:bg-brand/20"
                    >
                      {dub.label}{dub.original ? " · Original" : ""}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {item.cast?.length ? (
            <div className="glass-panel rounded-3xl p-6">
              <div className="flex items-center gap-2 text-accent">
                <Users size={18} />
                <h2 className="font-bold text-white">Cast</h2>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {item.cast.slice(0, 12).map((member) => (
                  <div key={member.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/5 bg-white/[.03] p-3">
                    {member.avatar ? (
                      <img src={member.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="h-11 w-11 shrink-0 rounded-full bg-white/5" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                      {member.character && (
                        <p className="truncate text-xs text-zinc-500">{member.character}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {recommendations.length > 0 && (
        <EntertainmentRail
          title="More from MovieBox"
          items={recommendations}
          href={item.kind === "show" ? "/series" : "/movies"}
        />
      )}
    </div>
  );
}
