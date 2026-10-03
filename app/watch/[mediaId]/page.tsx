import Link from "next/link";
import { notFound } from "next/navigation";
import { ListVideo } from "lucide-react";
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

function seriesHref(mediaId: string, season: number, episode: number) {
  const params = new URLSearchParams({
    season: String(season),
    episode: String(episode),
  });
  return `/watch/${encodeURIComponent(mediaId)}?${params.toString()}`;
}

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ mediaId: string }>;
  searchParams: SearchParams;
}) {
  const [{ mediaId }, query] = await Promise.all([params, searchParams]);

  if (!mediaId.startsWith("cb-")) notFound();

  const item = await cineplexbd.getDetails(mediaId);
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
  const nextHref =
    navigation && episode < navigation.episodes
      ? seriesHref(item.id, season, episode + 1)
      : undefined;
  const subtitle = isSeries ? `Season ${season} · Episode ${episode}` : item.year ? String(item.year) : undefined;

  return (
    <div className="min-h-screen bg-bg text-white">
      <WatchPlayer
        mediaId={item.id}
        title={item.title}
        subtitle={subtitle}
        backHref={`/entertainment/${item.slug}`}
        nextHref={nextHref}
        season={isSeries ? season : undefined}
        episode={isSeries ? episode : undefined}
      />

      <div className="mx-auto max-w-[1400px] space-y-8 px-5 py-8 sm:px-8 md:px-12 md:py-12">
        {navigation && (navigation.seasons.length > 1 || navigation.episodes > 1) && (
          <section className="glass-panel rounded-3xl p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <ListVideo size={18} className="text-accent" />
              <h2 className="font-bold">Episodes</h2>
            </div>

            {navigation.seasons.length > 1 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-zinc-500">Season</p>
                <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2">
                  {navigation.seasons.map((value) => (
                    <Link
                      key={value}
                      href={seriesHref(item.id, value, 1)}
                      className={`tv-focus shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold ${
                        value === season
                          ? "border-transparent accent-gradient text-white"
                          : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      Season {value}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {navigation.episodes > 1 && (
              <div className={navigation.seasons.length > 1 ? "mt-5" : ""}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-zinc-500">Episode</p>
                <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2">
                  {Array.from({ length: navigation.episodes }, (_, index) => index + 1).map((value) => (
                    <Link
                      key={value}
                      href={seriesHref(item.id, season, value)}
                      className={`tv-focus grid h-11 min-w-11 shrink-0 place-items-center rounded-full border px-3 text-sm font-semibold ${
                        value === episode
                          ? "border-transparent accent-gradient text-white"
                          : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
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

        <section className="max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Now playing</p>
          <h1 className="text-gradient mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">{item.title}</h1>
          {subtitle && <p className="mt-2 text-sm font-semibold text-zinc-400">{subtitle}</p>}
          {item.synopsis && <p className="mt-4 text-sm font-light leading-7 text-zinc-400 sm:text-base">{item.synopsis}</p>}
        </section>
      </div>
    </div>
  );
}
