import Link from "next/link";
import { Artwork } from "@/src/components/source-ui/artwork";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SavedToggle } from "@/src/components/saved-toggle";
import { catalogProvider } from "@/src/lib/providers/catalog";
import { lookupTmdbMetadata } from "@/src/lib/tmdb-bridge";
import {
  InlinePlaybackBanner,
  InlinePlayButton,
} from "@/src/components/inline-playback";

export const revalidate = 300;
export const preferredRegion = "sin1";

export default async function EntertainmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    autoplay?: string;
    season?: string;
    episode?: string;
  }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  if (!catalogProvider.canHandleId(slug)) notFound();

  const providerItem = await catalogProvider.getDetails(slug);
  if (!providerItem) notFound();

  // TMDB only enriches the presentation. IDs, streams and proxies remain provider-owned.
  const [tmdb, navigation] = await Promise.all([
    lookupTmdbMetadata(providerItem),
    providerItem.kind === "show"
      ? catalogProvider
          .getSeriesNavigation(
            providerItem.id,
            Math.max(1, Number(query.season) || 1),
          )
          .catch(() => null)
      : Promise.resolve(null),
  ]);
  const item = {
    ...providerItem,
    poster: tmdb?.poster || providerItem.poster,
    backdrop: tmdb?.backdrop || providerItem.backdrop,
    synopsis: tmdb?.synopsis || providerItem.synopsis,
    rating: tmdb?.rating ?? providerItem.rating,
    year: providerItem.year ?? tmdb?.year,
  };

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

  return (
    <>
      <div className="detail-heading">
        <Link href={item.kind === "show" ? "/series" : "/movies"}>
          <ArrowLeft size={17} /> Back to{" "}
          {item.kind === "show" ? "series" : "movies"}
        </Link>
        <span>
          {item.kind === "show" ? "THE NEXT CHAPTER" : "BEHIND THE STORY"}
        </span>
      </div>
      <InlinePlaybackBanner
        mediaId={providerItem.id}
        title={item.title}
        backHref={`/entertainment/${encodeURIComponent(item.id)}`}
        initialPlay={query.autoplay === "1"}
        initialSeason={Math.max(1, Number(query.season) || 1)}
        initialEpisode={Math.max(1, Number(query.episode) || 1)}
        navigation={navigation}
        poster={item.poster}
        details={
          <div className="page-content">
            <div className="detail-info">
              <div>
                <p className="eyebrow">THE STORY</p>
                <h2>
                  {item.kind === "show"
                    ? "A world to return to."
                    : "Take a closer look."}
                </h2>
                <p>
                  {item.synopsis || "No synopsis is available for this title."}
                </p>
              </div>
              <dl>
                {item.genres.length > 0 && (
                  <>
                    <dt>Genres</dt>
                    <dd>{item.genres.join(", ")}</dd>
                  </>
                )}
                {(item.cast?.length ?? 0) > 0 && (
                  <>
                    <dt>Starring</dt>
                    <dd>
                      {item.cast
                        ?.slice(0, 8)
                        .map((credit) => credit.name)
                        .join(", ")}
                    </dd>
                  </>
                )}
                {(item.languages?.length ?? 0) > 0 && (
                  <>
                    <dt>Collection language</dt>
                    <dd>{item.languages?.join(", ")}</dd>
                  </>
                )}
                <dt>Year</dt>
                <dd>{item.year || "Unavailable"}</dd>
              </dl>
            </div>
          </div>
        }
        historyItem={{
          slug: providerItem.slug,
          kind: providerItem.kind,
          poster: item.poster,
          year: item.year,
          genres: item.genres,
        }}
      >
        <section className="detail-hero">
          <div className="detail-art">
            <Artwork src={item.backdrop || item.poster} alt="" priority />
          </div>
          <div className="hero-shade" />
          <div className="detail-copy">
            <p className="eyebrow">
              {item.category ||
                (item.kind === "show" ? "SERIES" : "FEATURE FILM")}
            </p>
            <h1>{item.title}</h1>
            <div className="detail-meta">
              {metadata.slice(0, 6).map((value, index) => (
                <span key={index}>{value}</span>
              ))}
            </div>
            <p className="hero-synopsis">
              {item.synopsis ||
                "More information about this story is currently unavailable."}
            </p>
            <div className="actions">
              <InlinePlayButton className="primary">
                {item.kind === "show"
                  ? `Play S${navigation?.season ?? 1} · E${Math.max(1, Number(query.episode) || 1)}`
                  : "Play movie"}
              </InlinePlayButton>
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
                className="secondary"
              />
            </div>
          </div>
        </section>
      </InlinePlaybackBanner>
    </>
  );
}
