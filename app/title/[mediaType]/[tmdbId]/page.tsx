import Link from "next/link";
import { Artwork } from "@/src/components/source-ui/artwork";
import { catalogProvider } from "@/src/lib/providers/catalog";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTmdbDetails } from "@/src/lib/tmdb";
import {
  InlinePlaybackBanner,
  InlinePlayButton,
} from "@/src/components/inline-playback";
import { SavedToggle } from "@/src/components/saved-toggle";
import { findPlayableProviderMatch } from "@/src/lib/tmdb-bridge";

export const revalidate = 300;
export const preferredRegion = "sin1";

export default async function TmdbTitlePage({
  params,
  searchParams,
}: {
  params: Promise<{ mediaType: string; tmdbId: string }>;
  searchParams: Promise<{
    autoplay?: string;
    season?: string;
    episode?: string;
  }>;
}) {
  const [{ mediaType, tmdbId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
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
  const playable = await findPlayableProviderMatch({
    title: item.title,
    year: item.year,
    kind,
  });
  const savedItem = {
    id: `tmdb-${mediaType}-${item.id}`,
    slug: `tmdb-${mediaType}-${item.id}`,
    title: item.title,
    kind: kind as "movie" | "show",
    poster: item.poster,
    year: item.year,
    genres: item.genres,
  };

  const navigation =
    playable && kind === "show"
      ? await catalogProvider
          .getSeriesNavigation(
            playable.id,
            Math.max(1, Number(query.season) || 1),
          )
          .catch(() => null)
      : null;
  return (
    <>
      <div className="detail-heading">
        <Link href={kind === "show" ? "/series" : "/movies"}>
          <ArrowLeft size={17} /> Back to{" "}
          {kind === "show" ? "series" : "movies"}
        </Link>
        <span>{kind === "show" ? "THE NEXT CHAPTER" : "BEHIND THE STORY"}</span>
      </div>
      <InlinePlaybackBanner
        mediaId={playable?.id ?? ""}
        title={item.title}
        backHref={`/title/${mediaType}/${tmdbId}`}
        initialPlay={Boolean(playable && query.autoplay === "1")}
        initialSeason={Math.max(1, Number(query.season) || 1)}
        initialEpisode={Math.max(1, Number(query.episode) || 1)}
        navigation={navigation}
        poster={item.poster}
        historyItem={
          playable
            ? {
                slug: playable.slug,
                kind: playable.kind,
                poster: item.poster,
                year: item.year,
                genres: item.genres,
              }
            : undefined
        }
        details={
          <div className="page-content">
            <div className="detail-info">
              <div>
                <p className="eyebrow">THE STORY</p>
                <h2>
                  {kind === "show"
                    ? "A world to return to."
                    : "Take a closer look."}
                </h2>
                <p>
                  {item.overview || "No synopsis is available for this title."}
                </p>
              </div>
              <dl>
                <dt>Genres</dt>
                <dd>{item.genres.join(", ") || "Unavailable"}</dd>
                {item.cast.length > 0 && (
                  <>
                    <dt>Starring</dt>
                    <dd>
                      {item.cast
                        .slice(0, 8)
                        .map((credit) => credit.name)
                        .join(", ")}
                    </dd>
                  </>
                )}
                <dt>Year</dt>
                <dd>{item.year || "Unavailable"}</dd>
              </dl>
            </div>
          </div>
        }
      >
        <section className="detail-hero">
          <div className="detail-art">
            <Artwork src={item.backdrop || item.poster} alt="" priority />
          </div>
          <div className="hero-shade" />
          <div className="detail-copy">
            <p className="eyebrow">
              {kind === "show" ? "SERIES" : "FEATURE FILM"}
            </p>
            <h1>{item.title}</h1>
            <div className="detail-meta">
              {item.year && <span>{item.year}</span>}
              {item.rating !== undefined && (
                <span>★ {item.rating.toFixed(1)}</span>
              )}
              {item.runtimeMinutes && <span>{item.runtimeMinutes} min</span>}
              {item.numberOfSeasons && (
                <span>{item.numberOfSeasons} seasons</span>
              )}
            </div>
            <p className="hero-synopsis">
              {item.overview ||
                "More information about this story is currently unavailable."}
            </p>
            <div className="actions">
              {playable ? (
                <InlinePlayButton className="primary">
                  {kind === "show" ? "Play series" : "Play movie"}
                </InlinePlayButton>
              ) : (
                <button type="button" disabled className="primary">
                  Playback unavailable
                </button>
              )}
              <SavedToggle item={savedItem} className="secondary" />
            </div>
          </div>
        </section>
      </InlinePlaybackBanner>
    </>
  );
}
