import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Search } from "lucide-react";
import { BackLink } from "@/src/components/catalog-sections";
import { SavedToggle } from "@/src/components/saved-toggle";
import { catalogProvider } from "@/src/lib/providers/catalog";

export const revalidate = 300;

export default async function EntertainmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!catalogProvider.canHandleId(slug)) notFound();

  const item = await catalogProvider.getDetails(slug);
  if (!item) notFound();

  const metadata = [
    item.kind === "show" ? "Series" : "Movie",
    item.year !== undefined ? String(item.year) : "",
    item.rating !== undefined ? `★ ${item.rating}` : "",
    item.ratingCount ? `${item.ratingCount.toLocaleString()} ratings` : "",
    item.durationMinutes ? `${item.durationMinutes} min` : "",
    item.country ?? "",
    ...item.genres,
    item.episodes ? `${item.episodes} episodes` : "",
  ].filter(Boolean);

  const languages = item.languages ?? [];
  const cast = item.cast ?? [];

  return (
    <div className="space-y-5">
      <BackLink href={item.kind === "show" ? "/series" : "/movies"}>
        {item.kind === "show" ? "Series" : "Movies"}
      </BackLink>

      <section className="relative min-h-[620px] overflow-hidden rounded-[28px] border border-white/10 bg-surface">
        {item.backdrop && (
          <img
            src={item.backdrop}
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
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
                  loading="lazy"
                  decoding="async"
                  className="aspect-[2/3] w-full object-cover"
                />
              ) : (
                <div className="poster-fallback aspect-[2/3] w-full" />
              )}
            </div>

            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-accent">
                {item.provider === "moviebox" ? "MovieBox" : "PinFlix"} · {item.kind === "show" ? "Series" : "Movie"}
              </p>
              <h1 className="text-gradient mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl md:text-6xl">
                {item.title}
              </h1>

              {metadata.length > 0 && (
                <p className="mt-4 text-sm font-medium text-zinc-300">
                  {metadata.join(" · ")}
                </p>
              )}

              {languages.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {languages.slice(0, 8).map((language) => (
                    <span key={language} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                      {language}
                    </span>
                  ))}
                </div>
              )}

              {item.synopsis && (
                <p className="mt-5 max-w-2xl text-sm font-light leading-7 text-zinc-300 sm:text-base">
                  {item.synopsis}
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/watch/${item.id}`}
                  className="tv-focus accent-gradient inline-flex min-h-12 items-center gap-2 rounded-full px-7 py-3 font-bold text-white shadow-[0_0_30px_rgba(168,85,247,.22)]"
                >
                  <Play size={18} fill="currentColor" />
                  Play
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
                  href={`/search?q=${encodeURIComponent(item.title)}`}
                  className="tv-focus inline-flex min-h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/10"
                >
                  <Search size={18} />
                  Similar titles
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {cast.length > 0 && (
        <section className="glass-panel rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white">Cast</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cast.slice(0, 18).map((credit) => (
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
