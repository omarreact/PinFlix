import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/src/components/catalog-sections";
import { WatchPlayer } from "@/src/components/watch-player";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";

type SearchParams = Promise<{
  season?: string;
  episode?: string;
}>;

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function seriesHref(channelId: string, season: number, episode: number) {
  const params = new URLSearchParams({
    season: String(season),
    episode: String(episode),
  });
  return `/watch/${encodeURIComponent(channelId)}?${params.toString()}`;
}

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string }>;
  searchParams: SearchParams;
}) {
  const [{ channelId }, query] = await Promise.all([params, searchParams]);

  if (!channelId.startsWith("cb-")) notFound();

  const item = await cineplexbd.getDetails(channelId);
  if (!item) notFound();

  const isSeries = item.kind === "show";
  const requestedSeason = positiveInteger(query.season, 1);
  const navigation = isSeries
    ? await cineplexbd.getSeriesNavigation(item.id, requestedSeason)
    : null;
  const season = navigation?.season ?? requestedSeason;
  const requestedEpisode = positiveInteger(query.episode, 1);
  const episode = navigation
    ? Math.min(requestedEpisode, Math.max(1, navigation.episodes))
    : requestedEpisode;

  return (
    <div className="space-y-6">
      <BackLink href={`/entertainment/${item.slug}`}>Title details</BackLink>

      {navigation && (navigation.seasons.length > 1 || navigation.episodes > 1) && (
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
          {navigation.seasons.length > 1 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-muted">Season</p>
              <div className="flex flex-wrap gap-2">
                {navigation.seasons.map((value) => (
                  <Link
                    key={value}
                    href={seriesHref(item.id, value, 1)}
                    className={`tv-focus rounded-lg border px-3 py-2 text-sm font-semibold ${
                      value === season
                        ? "border-brand bg-brand text-black"
                        : "border-line bg-elevated text-muted hover:text-fg"
                    }`}
                  >
                    Season {value}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {navigation.episodes > 1 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-muted">Episode</p>
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {Array.from({ length: navigation.episodes }, (_, index) => index + 1).map((value) => (
                  <Link
                    key={value}
                    href={seriesHref(item.id, season, value)}
                    className={`tv-focus grid min-h-10 min-w-10 place-items-center rounded-lg border px-3 text-sm font-semibold ${
                      value === episode
                        ? "border-brand bg-brand text-black"
                        : "border-line bg-elevated text-muted hover:text-fg"
                    }`}
                  >
                    {value}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <WatchPlayer
        channelId={item.id}
        posterLabel={item.kind === "movie" ? "🎬" : "📺"}
        season={isSeries ? season : undefined}
        episode={isSeries ? episode : undefined}
      />

      <div>
        <p className="text-sm font-bold uppercase tracking-[.18em] text-brand">Now playing</p>
        <h1 className="mt-2 text-3xl font-black">{item.title}</h1>
        {isSeries && (
          <p className="mt-2 text-sm font-semibold text-muted">
            Season {season} · Episode {episode}
          </p>
        )}
        {item.synopsis && <p className="mt-2 text-muted">{item.synopsis}</p>}
      </div>
    </div>
  );
}
