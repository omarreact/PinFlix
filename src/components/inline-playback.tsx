"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ListVideo, Play } from "lucide-react";
import { WatchPlayer } from "@/src/components/watch-player";
import type { SeriesNavigation } from "@/src/lib/providers/contracts";

type HistoryItem = {
  slug: string;
  kind: "movie" | "show";
  poster?: string;
  year?: number;
  genres?: string[];
};
type PlaybackContextValue = { play: () => void };
const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function InlinePlayButton({ children = "Play", className }: {
  children?: ReactNode;
  className?: string;
}) {
  const player = useContext(PlaybackContext);
  if (!player) return null;
  return <button type="button" onClick={player.play}
    className={className ?? "pf-action media-focus inline-flex min-h-12 items-center gap-2 px-6 py-3"}
    aria-label="Play video here, inside the movie banner">
    <Play size={18} fill="currentColor" /> {children}
  </button>;
}

/** Keeps the original artwork and metadata in the server-rendered banner.
 * Clicking Play only mounts the established player inside that banner:
 * no modal, no route navigation and no new stream endpoint.
 */
export function InlinePlaybackBanner({
  mediaId, title, backHref, historyItem, children, navigation,
  initialSeason = 1, initialEpisode = 1, initialPlay = false,
}: {
  mediaId: string;
  title: string;
  backHref: string;
  historyItem?: HistoryItem;
  children: ReactNode;
  navigation?: SeriesNavigation | null;
  initialSeason?: number;
  initialEpisode?: number;
  initialPlay?: boolean;
}) {
  const [playing, setPlaying] = useState(initialPlay);
  const validSeasons = navigation?.seasons?.length ? navigation.seasons : [1];
  const [season, setSeason] = useState(() => validSeasons.includes(initialSeason) ? initialSeason : validSeasons[0]);
  const [episode, setEpisode] = useState(() => Math.max(1, Math.min(initialEpisode, navigation?.episodes ?? 1)));
  const [attempt, setAttempt] = useState(0);
  const isShow = historyItem?.kind === "show";

  // Opening a saved watch link updates the banner even if Next preserves the
  // component instance between search-param changes.
  useEffect(() => {
    if (!initialPlay) return;
    const id = window.setTimeout(() => setPlaying(true), 0);
    return () => window.clearTimeout(id);
  }, [initialPlay]);

  function open() { setPlaying(true); }
  function selectEpisode(newSeason: number, newEpisode: number) {
    setSeason(newSeason);
    setEpisode(newEpisode);
    setAttempt(number => number + 1);
    setPlaying(true);
  }
  function nextEpisode() {
    if (!navigation || episode >= navigation.episodes) return;
    selectEpisode(season, episode + 1);
  }

  return <PlaybackContext.Provider value={{ play: open }}>
    {playing ? (
      <section className="pf-inline-video-shell overflow-hidden rounded-xl border border-line bg-black"
        aria-label={`Watching ${title}`}>
        <WatchPlayer
          key={`${mediaId}-${season}-${episode}-${attempt}`}
          inline
          mediaId={mediaId}
          title={title}
          subtitle={isShow ? `Season ${season} · Episode ${episode}` : undefined}
          backHref={backHref}
          onClose={() => setPlaying(false)}
          onNext={isShow && navigation && episode < navigation.episodes ? nextEpisode : undefined}
          season={isShow ? season : undefined}
          episode={isShow ? episode : undefined}
          historyItem={historyItem}
        />
      </section>
    ) : children}

    {isShow && navigation && (navigation.seasons.length > 1 || navigation.episodes > 1) && (
      <section className="glass-panel mt-5 rounded-xl p-4 sm:p-6" aria-label="TV episode selector">
        <div className="mb-4 flex items-center gap-2"><ListVideo size={18} className="text-brand"/>
          <h2 className="text-lg font-semibold">Episodes</h2>
          {playing && <span className="ml-auto text-xs text-muted">Playing season {season}, episode {episode}</span>}
        </div>
        {navigation.seasons.length > 1 && <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {navigation.seasons.map(value => <button key={value} type="button"
            aria-pressed={value === season}
            onClick={() => selectEpisode(value, 1)}
            className={`media-focus min-h-10 shrink-0 rounded-md border px-4 text-sm ${value === season ? "border-brand bg-brand text-bg" : "border-line bg-surface text-muted"}`}>
            Season {value}
          </button>)}
        </div>}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
          {Array.from({length: Math.min(200, navigation.episodes)}, (_, index) => index + 1).map(value =>
            <button key={value} type="button"
              aria-label={`Play episode ${value}`} aria-pressed={playing && episode === value}
              onClick={() => selectEpisode(season, value)}
              className={`media-focus min-h-11 rounded-md border text-sm ${playing && episode === value ? "border-brand bg-brand text-bg" : "border-line bg-surface text-fg hover:border-brand"}`}>
              {value}
            </button>)}
        </div>
      </section>
    )}
  </PlaybackContext.Provider>;
}
