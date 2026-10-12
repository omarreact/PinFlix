"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronRight, LoaderCircle, Play } from "lucide-react";
import { WatchPlayer } from "@/src/components/watch-player";
import { Artwork } from "@/src/components/source-ui/artwork";
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

export function InlinePlayButton({
  children = "Play",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const player = useContext(PlaybackContext);
  if (!player) return null;
  return (
    <button
      type="button"
      onClick={player.play}
      className={
        className ??
        "pf-action media-focus inline-flex min-h-12 items-center gap-2 px-6 py-3"
      }
      aria-label="Play video here, inside the movie banner"
    >
      <Play size={18} fill="currentColor" /> {children}
    </button>
  );
}

/** Keeps the original artwork and metadata in the server-rendered banner.
 * Clicking Play only mounts the established player inside that banner:
 * no modal, no route navigation and no new stream endpoint.
 */
export function InlinePlaybackBanner({
  mediaId,
  title,
  backHref,
  historyItem,
  children,
  navigation: initialNavigation,
  poster,
  details,
  initialSeason = 1,
  initialEpisode = 1,
  initialPlay = false,
}: {
  mediaId: string;
  title: string;
  backHref: string;
  historyItem?: HistoryItem;
  children: ReactNode;
  details?: ReactNode;
  poster?: string;
  navigation?: SeriesNavigation | null;
  initialSeason?: number;
  initialEpisode?: number;
  initialPlay?: boolean;
}) {
  const [navigation, setNavigation] = useState(initialNavigation);
  const [seasonBusy, setSeasonBusy] = useState(false);
  const [seasonError, setSeasonError] = useState("");
  const seasonRequest = useRef<AbortController | null>(null);
  useEffect(() => () => seasonRequest.current?.abort(), []);
  const [playing, setPlaying] = useState(initialPlay);
  const validSeasons = navigation?.seasons?.length ? navigation.seasons : [1];
  const [season, setSeason] = useState(() =>
    validSeasons.includes(initialSeason) ? initialSeason : validSeasons[0],
  );
  const [episode, setEpisode] = useState(() =>
    Math.max(1, Math.min(initialEpisode, navigation?.episodes ?? 1)),
  );
  const [attempt, setAttempt] = useState(0);
  const isShow = historyItem?.kind === "show";

  // Opening a saved watch link updates the banner even if Next preserves the
  // component instance between search-param changes.
  useEffect(() => {
    if (!initialPlay) return;
    const id = window.setTimeout(() => setPlaying(true), 0);
    return () => window.clearTimeout(id);
  }, [initialPlay]);

  function open() {
    setPlaying(true);
  }
  function selectEpisode(newSeason: number, newEpisode: number) {
    setSeason(newSeason);
    setEpisode(newEpisode);
    setAttempt((number) => number + 1);
    setPlaying(true);
  }
  async function selectSeason(value: number) {
    if (value === season) return;
    seasonRequest.current?.abort();
    const controller = new AbortController();
    seasonRequest.current = controller;
    setSeasonBusy(true);
    setSeasonError("");
    try {
      const response = await fetch(
        `/api/ui/episodes?id=${encodeURIComponent(mediaId)}&season=${value}`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error("Episodes could not be loaded.");
      const next: SeriesNavigation = await response.json();
      if (controller.signal.aborted) return;
      if (
        next.season !== value ||
        !Number.isInteger(next.episodes) ||
        next.episodes < 0
      )
        throw new Error("Invalid episode information.");
      setNavigation(next);
      setSeason(value);
      setEpisode(1);
      setPlaying(false);
    } catch {
      if (!controller.signal.aborted)
        setSeasonError("This season could not be loaded. Please try again.");
    } finally {
      if (!controller.signal.aborted) setSeasonBusy(false);
    }
  }
  function nextEpisode() {
    if (!navigation || episode >= navigation.episodes) return;
    selectEpisode(season, episode + 1);
  }

  return (
    <PlaybackContext.Provider value={{ play: open }}>
      {playing ? (
        <section
          className="pf-inline-video-shell bg-black"
          aria-label={`Watching ${title}`}
        >
          <WatchPlayer
            key={`${mediaId}-${season}-${episode}-${attempt}`}
            inline
            mediaId={mediaId}
            title={title}
            subtitle={
              isShow ? `Season ${season} · Episode ${episode}` : undefined
            }
            backHref={backHref}
            onClose={() => setPlaying(false)}
            onNext={
              isShow && navigation && episode < navigation.episodes
                ? nextEpisode
                : undefined
            }
            season={isShow ? season : undefined}
            episode={isShow ? episode : undefined}
            historyItem={historyItem}
          />
        </section>
      ) : (
        children
      )}

      {details}
      {isShow && navigation && (
        <div className="page-content">
          <section className="section" aria-label="TV episode selector">
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE NEXT CHAPTER</p>
                <h2>One more episode.</h2>
              </div>
              <label className="season-select">
                Season{" "}
                <select
                  aria-label="Select season"
                  value={season}
                  disabled={seasonBusy}
                  onChange={(event) =>
                    void selectSeason(Number(event.target.value))
                  }
                >
                  {validSeasons.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {seasonBusy && (
              <p role="status" className="muted">
                <LoaderCircle size={18} className="spin" /> Loading episodes…
              </p>
            )}
            {seasonError && (
              <p role="alert" className="notice">
                {seasonError}
              </p>
            )}
            <div className="episodes">
              {Array.from(
                { length: Math.min(200, navigation.episodes) },
                (_, index) => index + 1,
              ).map((value) => (
                <div
                  key={value}
                  className={`episode ${playing && episode === value ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className="episode-btn"
                    disabled={seasonBusy}
                    aria-label={`Play episode ${value}`}
                    aria-pressed={playing && episode === value}
                    onClick={() => selectEpisode(season, value)}
                  >
                    <div className="episode-art">
                      <Artwork src={poster || null} alt={`Episode ${value}`} />
                      <span>
                        <Play fill="currentColor" size={20} />
                      </span>
                    </div>
                    <div className="episode-copy">
                      <small>EPISODE {String(value).padStart(2, "0")}</small>
                      <h3>Episode {value}</h3>
                    </div>
                    <ChevronRight size={19} />
                  </button>
                </div>
              ))}
            </div>
            {navigation.episodes === 0 && (
              <p className="empty">
                Episodes are not available for this season.
              </p>
            )}
          </section>
        </div>
      )}
    </PlaybackContext.Provider>
  );
}
