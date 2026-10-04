import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Search } from "lucide-react";
import { BackLink } from "@/src/components/catalog-sections";
import { SavedToggle } from "@/src/components/saved-toggle";
import { getTMDBImageUrl } from "@/src/lib/tmdb/images";
import { getMovieDetails, getTVDetails } from "@/src/lib/tmdb/queries";
import { catalogProvider } from "@/src/lib/providers/catalog";\nimport { findPlayableMatch } from "@/src/lib/providers/matching";
import type { Entertainment } from "@/src/types/catalog";

export const dynamic = "force-dynamic";

type DetailState = {
  item: Entertainment;
  playableId?: string;
  source: "catalog" | "tmdb";
  runtime?: number;
  seasons?: number;
};

function parseTMDBSlug(slug: string) {
  const match = slug.match(/^tmdb-(movie|tv)-(\d+)$/);
  if (!match) return null;

  const id = Number(match[2]);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  return { type: match[1] as "movie" | "tv", id };
}

async function getDetailState(slug: string): Promise<DetailState | null> {
  const tmdbRef = parseTMDBSlug(slug);

  if (tmdbRef) {
    try {
      if (tmdbRef.type === "movie") {
        const details = await getMovieDetails(tmdbRef.id);
        const title = details.title;
        const year = details.release_date?.slice(0, 4)
          ? Number(details.release_date.slice(0, 4))
          : undefined;
        const playable = await findPlayableMatch(catalogProvider, {
          title,
          aliases: [details.original_title],
          kind: "movie",
          year,
        });

        return {
          source: "tmdb",
          playableId: playable?.id,
          runtime: details.runtime ?? undefined,
          item: {
            id: slug,
            slug,
            provider: "tmdb",
            providerId: String(details.id),
            title,
            kind: "movie",
            ...(year !== undefined ? { year } : {}),
            ...(Number.isFinite(details.vote_average)
              ? { rating: Number(details.vote_average.toFixed(1)) }
              : {}),
            genres: details.genres.map((genre) => genre.name),
            backdrop:
              getTMDBImageUrl(details.backdrop_path, "original") ??
              getTMDBImageUrl(details.poster_path, "original") ??
              "",
            poster: getTMDBImageUrl(details.poster_path, "w500") ?? "",
            synopsis: details.overview ?? "",
          },
        };
      }

      const details = await getTVDetails(tmdbRef.id);
      const title = details.name;
      const year = details.first_air_date?.slice(0, 4)
        ? Number(details.first_air_date.slice(0, 4))
        : undefined;
      const playable = await findPlayableMatch(catalogProvider, {
        title,
        aliases: [details.original_name],
        kind: "show",
        year,
      });

      return {
        source: "tmdb",
        playableId: playable?.id,
        runtime: details.episode_run_time?.[0],
        seasons: details.number_of_seasons,
        item: {
          id: slug,
          slug,
          provider: "tmdb",
          providerId: String(details.id),
          title,
          kind: "show",
          ...(year !== undefined ? { year } : {}),
          ...(Number.isFinite(details.vote_average)
            ? { rating: Number(details.vote_average.toFixed(1)) }
            : {}),
          genres: details.genres.map((genre) => genre.name),
          backdrop:
            getTMDBImageUrl(details.backdrop_path, "original") ??
            getTMDBImageUrl(details.poster_path, "original") ??
            "",
          poster: getTMDBImageUrl(details.poster_path, "w500") ?? "",
          synopsis: details.overview ?? "",
          ...(details.number_of_episodes
            ? { episodes: details.number_of_episodes }
            : {}),
        },
      };
    } catch {
      return null;
    }
  }

  if (!catalogProvider.canHandleId(slug)) return null;

  const item = await catalogProvider.getDetails(slug);
  if (!item) return null;

  return {
    item,
    playableId: item.id,
    source: "catalog",
  };
}

export default async function EntertainmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getDetailState(slug);
  if (!detail) notFound();

  const { item, playableId, source, runtime, seasons } = detail;

  const metadata = [
    item.kind === "show" ? "Series" : "Movie",
    item.year !== undefined ? String(item.year) : "",
    item.rating !== undefined ? `★ ${item.rating}` : "",
    runtime ? `${runtime} min` : "",
    seasons ? `${seasons} season${seasons === 1 ? "" : "s"}` : "",
    ...item.genres,
    item.episodes ? `${item.episodes} episodes` : "",
  ].filter(Boolean);

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
                {source === "tmdb"
                  ? `TMDB · ${item.kind === "show" ? "Series" : "Movie"}`
                  : `PinFlix ${item.kind === "show" ? "Series" : "Movie"}`}
              </p>
              <h1 className="text-gradient mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl md:text-6xl">
                {item.title}
              </h1>
              {metadata.length > 0 && (
                <p className="mt-4 text-sm font-medium text-zinc-300">
                  {metadata.join(" · ")}
                </p>
              )}
              {item.synopsis && (
                <p className="mt-5 max-w-2xl text-sm font-light leading-7 text-zinc-300 sm:text-base">
                  {item.synopsis}
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {playableId ? (
                  <Link
                    href={`/watch/${playableId}`}
                    className="tv-focus accent-gradient inline-flex min-h-12 items-center gap-2 rounded-full px-7 py-3 font-bold text-white shadow-[0_0_30px_rgba(168,85,247,.22)]"
                  >
                    <Play size={18} fill="currentColor" />
                    Play
                  </Link>
                ) : (
                  <Link
                    href={`/search?q=${encodeURIComponent(item.title)}`}
                    className="tv-focus accent-gradient inline-flex min-h-12 items-center gap-2 rounded-full px-7 py-3 font-bold text-white shadow-[0_0_30px_rgba(168,85,247,.22)]"
                  >
                    <Search size={18} />
                    Find playback
                  </Link>
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

              {source === "tmdb" && !playableId && (
                <p className="mt-4 text-xs leading-5 text-zinc-500">
                  Details are available, but this title is not currently linked to a verified PinFlix playback source.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
