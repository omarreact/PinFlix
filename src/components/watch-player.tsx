"use client";

import Link from "next/link";
import { saveProgress } from "@/src/lib/history";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LoaderCircle,
  Tv,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

type ResolvedSubtitle = { label: string; language: string; url: string; blobUrl?: string };
type ResolvedSource = {
  url: string;
  quality: string;
  protocol: "hls" | "native" | "embed";
  priority: number;
  sourceIndex: number;
  subtitles?: ResolvedSubtitle[];
};
type ResolveResponse = {
  sources?: Array<Omit<ResolvedSource, "sourceIndex">>;
  error?: string;
};
type NativeAudioTrack = { label?: string; language?: string; enabled: boolean };
type VideoWithAudio = HTMLVideoElement & { audioTracks?: ArrayLike<NativeAudioTrack> };
type HlsLevel = { index: number; label: string };

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function srtToVttBlobUrl(srtUrl: string): Promise<string> {
  try {
    const response = await fetch(srtUrl);
    if (!response.ok) throw new Error("Failed to fetch subtitle");
    const srtText = await response.text();
    const vttText =
      "WEBVTT\n\n" +
      srtText.replace(/\r\n|\r/g, "\n").replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
    return URL.createObjectURL(new Blob([vttText], { type: "text/vtt" }));
  } catch (error) {
    console.error("Subtitle load error:", error);
    return "";
  }
}

export function WatchPlayer({
  mediaId,
  title,
  subtitle,
  backHref,
  nextHref,
  inline = false,
  onClose,
  onNext,
  season,
  episode,
  historyItem,
}: {
  mediaId: string;
  title: string;
  subtitle?: string;
  backHref: string;
  nextHref?: string;
  inline?: boolean;
  onClose?: () => void;
  onNext?: () => void;
  season?: number;
  episode?: number;
  historyItem?: { slug: string; kind: "movie" | "show"; poster?: string; year?: number; genres?: string[] };
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const failoverRef = useRef<() => void>(() => undefined);
  const [sources, setSources] = useState<ResolvedSource[]>([]);
  const [sourcePosition, setSourcePosition] = useState(0);
  const [hlsLevels, setHlsLevels] = useState<HlsLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [audioTracks, setAudioTracks] = useState<{ index: number; label: string }[]>([]);
  const [selectedAudio, setSelectedAudio] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<ResolvedSubtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState("off");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.9);
  const [buffering, setBuffering] = useState(true);
  const [status, setStatus] = useState<"loading" | "ready" | "switching" | "error">("loading");
  const [error, setError] = useState("");
  const [playbackRate, setPlaybackRate] = useState(1);
  const resumePositionRef = useRef(0);
  const lastReportedTimeRef = useRef(-1);
  const lastSavedAtRef = useRef(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [landscapeFallback, setLandscapeFallback] = useState(false);
  const [fit, setFit] = useState<"contain" | "cover" | "fill">("contain");
  const [touchIndicator, setTouchIndicator] = useState<"left" | "right" | null>(null);
  const lastTap = useRef<{ time: number; side: "left" | "right" } | null>(null);
  const lastTouchTime = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fullscreenMessage, setFullscreenMessage] = useState("");
  const orientationLockedRef = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Apply persisted preference after hydration without a cascading synchronous effect.
    const timer = window.setTimeout(() => {
      const savedSpeed = Number(window.localStorage.getItem("pinflix-playback-rate"));
      if ([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].includes(savedSpeed)) setPlaybackRate(savedSpeed);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!historyItem) return;
    const video = videoRef.current;
    if (!video) return;
    let lastSaved = 0;
    const record = () => {
      const position = video.currentTime;
      const length = video.duration;
      if (!Number.isFinite(position) || position < 1 || !Number.isFinite(length) || length <= 0) return;
      if (Math.abs(position - lastSaved) < 10 && !video.ended) return;
      lastSaved = position;
      saveProgress({
        id: mediaId, slug: historyItem.slug, title, kind: historyItem.kind,
        poster: historyItem.poster, year: historyItem.year, genres: historyItem.genres,
        season, episode, position, duration: length, updatedAt: Date.now(),
        completed: video.ended || position / length >= 0.95,
      });
    };
    video.addEventListener("timeupdate", record);
    video.addEventListener("ended", record);
    return () => { record(); video.removeEventListener("timeupdate", record); video.removeEventListener("ended", record); };
  }, [mediaId, title, historyItem?.slug, historyItem?.kind, historyItem?.poster, historyItem?.year, historyItem?.genres, season, episode]);

  const source = sources[sourcePosition];
  const isEmbed = source?.protocol === "embed";
  // Derive embed UI state — do not sync via setState in an effect (eslint react-hooks/set-state-in-effect)
  const displayStatus = isEmbed ? "ready" : status;
  const displayBuffering = isEmbed ? false : buffering;
  const displayPlaying = isEmbed ? true : playing;

  const resolveStreams = useCallback(async () => {
    const params = new URLSearchParams({ id: mediaId });
    if (season) params.set("season", String(season));
    if (episode) params.set("episode", String(episode));

    const response = await fetch(`/api/resolve?${params.toString()}`, {
      cache: "no-store",
    });
    const result = (await response.json()) as ResolveResponse;

    if (!response.ok) {
      throw new Error(result.error || `Stream resolution failed (${response.status}).`);
    }
    if (!Array.isArray(result.sources)) {
      throw new Error("The stream resolver returned an invalid response.");
    }

    return result.sources.map((source, index) => ({
      ...source,
      sourceIndex: index,
    }));
  }, [mediaId, season, episode]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (displayPlaying) {
      hideTimer.current = setTimeout(() => { if (!shellRef.current?.contains(document.activeElement)) setControlsVisible(false); }, 3000);
    }
  }, [displayPlaying]);

  useEffect(() => {
    if (!displayPlaying) return;
    const timer = window.setTimeout(() => { if (!shellRef.current?.contains(document.activeElement)) setControlsVisible(false); }, 3500);
    return () => window.clearTimeout(timer);
  }, [displayPlaying]);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (indicatorTimer.current) clearTimeout(indicatorTimer.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const savedQuality = window.localStorage.getItem("pinflix-quality");
    resolveStreams()
      .then((resolved) => {
        if (cancelled) return;
        if (savedQuality) {
          const savedPosition = resolved.findIndex((item) => item.quality === savedQuality);
          if (savedPosition >= 0) setSourcePosition(savedPosition);
        }
        setSources(resolved);
        setStatus(resolved.length ? "loading" : "error");
        if (!resolved.length) setError("No playable sources are available.");
      })
      .catch((reason: Error) => {
        if (cancelled) return;
        setStatus("error");
        setError(reason.message);
      });
    return () => {
      cancelled = true;
    };
  }, [resolveStreams]);

  useEffect(() => {
    if (!displayBuffering || displayStatus !== "ready" || isEmbed) return;
    const stallTimeout = setTimeout(() => {
      console.warn("Stall detected, forcing failover");
      failoverRef.current();
    }, 10000);
    return () => clearTimeout(stallTimeout);
  }, [displayBuffering, displayStatus, isEmbed]);

  useEffect(() => {
    // Embed mode: iframe only — no video element work, no setState sync
    if (isEmbed || !source) return;

    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    // Schedule state updates after paint to satisfy react-hooks/set-state-in-effect
    const boot = window.setTimeout(() => {
      if (cancelled) return;
      setStatus("loading");
      setBuffering(true);
      setError("");
      setHlsLevels([]);
      setSelectedLevel(-1);
      setAudioTracks([]);
      setSelectedAudio(-1);
      setSubtitleTracks(source.subtitles ?? []);
      setSelectedSubtitle("off");
    }, 0);

    hlsRef.current?.destroy();
    hlsRef.current = null;

    const playResolved = () => {
      if (cancelled) return;
      video.muted = muted;
      video.volume = volume;
      video.playbackRate = playbackRate;
      video.play()
        .then(() => {
          if (cancelled) return;
          setPlaying(true);
          setStatus("ready");
          setBuffering(false);
        })
        .catch(() => {
          if (cancelled) return;
          // User gesture can start an autoplay-blocked stream.
          setStatus("ready");
          setBuffering(false);
          setPlaying(false);
        });
    };

    let failed = false;
    const failover = () => {
      if (cancelled || failed) return;
      failed = true;
      const position = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      if (position > 0) {
        resumePositionRef.current = position;
        window.localStorage.setItem(
          `pinflix-resume-${mediaId}-${season || 0}-${episode || 0}`,
          String(position),
        );
      }
      // Do not re-resolve the same URL in a loop. Fail over once per source;
      // a manual retry explicitly asks the server for fresh signed sources.
      if (sourcePosition + 1 < sources.length) {
        setStatus("switching");
        setSourcePosition(sourcePosition + 1);
      } else {
        setBuffering(false);
        setStatus("error");
        setError("This stream stopped. Try again to request fresh playback links.");
      }
    };
    failoverRef.current = failover;

    if (source.protocol === "hls" && !video.canPlayType("application/vnd.apple.mpegurl")) {
      void import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled || !Hls.isSupported()) {
            failover();
            return;
          }
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
            if (cancelled) return;
            const levels = data.levels.map((level, index) => ({
              index,
              label: level.height ? `${level.height}p` : `Level ${index + 1}`,
            }));
            setHlsLevels(levels);
            try {
              const preference = window.localStorage.getItem("pinflix-hls-quality");
              const preferred = levels.find(level => level.label === preference);
              if (preferred) {
                hls.nextLevel = preferred.index;
                setSelectedLevel(preferred.index);
              }
            } catch { /* private mode can deny storage */ }
            playResolved();
          });
          hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
            if (cancelled) return;
            setAudioTracks(data.audioTracks.map((track, index) => ({ index, label: track.name || track.lang || `Audio ${index + 1}` })));
            setSelectedAudio(hls.audioTrack);
          });
          hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
            if (!cancelled) setSelectedAudio(data.id);
          });
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) failover();
          });
          hls.loadSource(source.url);
          hls.attachMedia(video);
        })
        .catch(() => failover());
    } else if (source.protocol === "native" || source.protocol === "hls") {
      video.src = source.url;
      video.load();
      playResolved();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(boot);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
      failoverRef.current = () => undefined;
    };
    // muted/volume/playbackRate applied in dedicated effects; resolveStreams is stable via useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload only when source identity changes
  }, [mediaId, source, sourcePosition, sources.length, isEmbed, resolveStreams, season, episode]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = muted;
      video.volume = muted ? 0 : volume;
    }
  }, [muted, volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video || isEmbed) return;
      const tag = (event.target as HTMLElement)?.tagName;
      if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(tag)) return;

      showControls();
      if (event.key === "Escape") {
        return;
      }
      if (event.key === " " || event.key.toLowerCase() === "k") {
        event.preventDefault();
        void togglePlayback();
      }
      if (event.key === "ArrowRight") { event.preventDefault(); video.currentTime = Math.min(duration || video.duration, video.currentTime + 10); }
      if (event.key === "ArrowLeft") { event.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 10); }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setVolume((v) => Math.min(1, Math.round((v + 0.05) * 100) / 100));
        setMuted(false);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setVolume((v) => Math.max(0, Math.round((v - 0.05) * 100) / 100));
      }
      if (event.key.toLowerCase() === "m") setMuted((value) => !value);
      if (event.key.toLowerCase() === "f") void toggleFullscreen();
      if (event.key.toLowerCase() === "j") video.currentTime = Math.max(0, video.currentTime - 10);
      if (event.key.toLowerCase() === "l") video.currentTime = Math.min(duration, video.currentTime + 10);
      if (event.key === ",") video.currentTime = Math.max(0, video.currentTime - 0.04);
      if (event.key === ".") video.currentTime = Math.min(duration, video.currentTime + 0.04);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || isEmbed) return;
    if (video.paused) {
      try { await video.play(); setPlaying(true); }
      catch { setPlaying(false); }
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  async function toggleFullscreen() {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }
    setFullscreenMessage("");
    try {
      // Android Chrome permits screen.orientation.lock after a user-activated
      // fullscreen request. The existing streaming URL is never changed.
      if (typeof shell.requestFullscreen !== "function") throw new Error("unsupported");
      await shell.requestFullscreen();
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (direction: "landscape") => Promise<void>;
      };
      if (typeof orientation?.lock === "function") {
        try {
          await orientation.lock("landscape");
          orientationLockedRef.current = true;
          setLandscapeFallback(false);
          return;
        } catch { /* Device/browser does not permit locking orientation. */ }
      }
      const portrait = window.matchMedia?.("(orientation: portrait)").matches ?? false;
      const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
      setLandscapeFallback(portrait && touch);
    } catch {
      // iPhone Safari may allow only native video fullscreen.
      const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
      if (video && typeof video.webkitEnterFullscreen === "function") {
        try { video.webkitEnterFullscreen(); return; } catch { /* show fallback notice */ }
      }
      setFullscreenMessage("Fullscreen is unavailable. Rotate your phone to view the video in landscape.");
    }
  }

  useEffect(() => {
    const sync = () => {
      const active = document.fullscreenElement === shellRef.current;
      setIsFullscreen(active);
      if (!active) {
        setLandscapeFallback(false);
        if (orientationLockedRef.current) {
          orientationLockedRef.current = false;
          try { (screen.orientation as ScreenOrientation & {unlock?: () => void})?.unlock?.(); }
          catch { /* Browser also unlocks when leaving fullscreen. */ }
        }
      }
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  async function togglePiP() {
    const video = videoRef.current;
    if (!video || isEmbed) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch (err) {
      console.error("PiP error:", err);
    }
  }

  function seekTo(ratio: number) {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = Math.max(0, Math.min(duration, duration * ratio));
  }

  function chooseSource(position: number) {
    if (position === sourcePosition) return;
    const video = videoRef.current;
    if (video && Number.isFinite(video.currentTime)) resumePositionRef.current = video.currentTime;
    window.localStorage.setItem("pinflix-quality", sources[position]?.quality ?? "");
    setSourcePosition(position);
  }

  function chooseLevel(index: number) {
    // nextLevel allows a switch at the next segment instead of flushing the active buffer.
    if (hlsRef.current) hlsRef.current.nextLevel = index;
    setSelectedLevel(index);
    window.localStorage.setItem(
      "pinflix-hls-quality",
      hlsLevels.find(level => level.index === index)?.label ?? "auto",
    );
  }

  async function chooseSubtitle(value: string) {
    setSelectedSubtitle(value);

    const trackObj = subtitleTracks.find((t) => t.language === value);
    if (trackObj && !trackObj.blobUrl && trackObj.url) {
      const blobUrl = await srtToVttBlobUrl(trackObj.url);
      setSubtitleTracks((tracks) =>
        tracks.map((t) => (t.language === value ? { ...t, blobUrl } : t)),
      );
    }

    setTimeout(() => {
      const tracks = videoRef.current?.textTracks;
      if (tracks) {
        for (let index = 0; index < tracks.length; index += 1) {
          tracks[index].mode = tracks[index].language === value ? "showing" : "hidden";
        }
      }
    }, 100);
  }

  const isBusy = !isEmbed && (displayStatus === "loading" || displayStatus === "switching");
  function handleSurfaceTap(event: React.TouchEvent<HTMLDivElement>) {
    if (isEmbed || (event.target as Element).closest("button,select,input,a,label") || event.changedTouches.length !== 1) return;
    const now = Date.now();
    lastTouchTime.current = now;
    const bounds = event.currentTarget.getBoundingClientRect();
    const side = event.changedTouches[0].clientX < bounds.left + bounds.width / 2 ? "left" : "right";
    const previous = lastTap.current;
    if (previous && now - previous.time < 320 && previous.side === side) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      lastTap.current = null;
      const video = videoRef.current;
      if (video) video.currentTime = Math.max(0, Math.min(duration || Infinity, video.currentTime + (side === "left" ? -5 : 5)));
      setTouchIndicator(side);
      if (indicatorTimer.current) clearTimeout(indicatorTimer.current);
      indicatorTimer.current = setTimeout(() => setTouchIndicator(null), 600);
      showControls();
    } else {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      lastTap.current = { time: now, side };
      tapTimer.current = setTimeout(() => {
        lastTap.current = null;
        if (!controlsVisible) showControls();
        else void togglePlayback();
      }, 320);
    }
  }

  return (
    <div
      ref={shellRef}
      className={`pf-player ${inline ? "pf-inline-player" : "pf-legacy-player"} relative overflow-hidden bg-black text-white ${landscapeFallback ? "pf-landscape-fallback" : ""}`}
      onMouseMove={showControls}
      onTouchEnd={handleSurfaceTap}
      onFocus={showControls}
      onBlur={showControls}
    >
      <div className="pf-player-stage absolute inset-0">
        {isEmbed && source ? (
          <iframe
            title={title}
            src={source.url}
            className="absolute inset-0 h-full w-full border-0 bg-black"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
          />
        ) : (
          <video
            ref={videoRef}
            muted={muted}
            controls={false}
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full bg-black"
            style={{ objectFit: fit }}
            aria-label={`Player for ${title}`}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onWaiting={() => setBuffering(true)}
            onPlaying={() => {
              setBuffering(false);
              setStatus("ready");
            }}
            onCanPlay={() => {
              setBuffering(false);
              setStatus((current) => (current === "loading" ? "ready" : current));
            }}
            onLoadedData={() => setBuffering(false)}
            onTimeUpdate={() => {
              const video = videoRef.current;
              if (!video) return;
              // Limit React renders on high-frequency timeupdate events.
              if (Math.abs(video.currentTime - lastReportedTimeRef.current) >= 0.25) {
                lastReportedTimeRef.current = video.currentTime;
                setCurrentTime(video.currentTime);
              }
              if (Math.abs(video.currentTime - lastSavedAtRef.current) >= 5) {
                lastSavedAtRef.current = video.currentTime;
                window.localStorage.setItem(`pinflix-resume-${mediaId}-${season || 0}-${episode || 0}`, String(video.currentTime));
              }
            }}
            onDurationChange={() => { const length = videoRef.current?.duration; setDuration(length && Number.isFinite(length) ? length : 0); }}
            onLoadedMetadata={() => {
              const video = videoRef.current;
              if (!video) return;
              setDuration(Number.isFinite(video.duration) ? video.duration : 0);
              const nativeTracks = (video as VideoWithAudio).audioTracks;
              if (nativeTracks?.length) {
                const tracks = Array.from(nativeTracks);
                setAudioTracks(tracks.map((track, index) => ({ index, label: track.label || track.language || `Audio ${index + 1}` })));
                setSelectedAudio(tracks.findIndex(track => track.enabled));
              }
              const saved = Number(window.localStorage.getItem(`pinflix-resume-${mediaId}-${season || 0}-${episode || 0}`));
              const requested = resumePositionRef.current > 5 ? resumePositionRef.current : saved;
              if (requested > 5 && Number.isFinite(requested) && requested < video.duration - 3) {
                video.currentTime = requested;
              }
              resumePositionRef.current = 0;
            }}
            onError={() => failoverRef.current()}
            onEnded={() => {
              if (onNext) onNext();
              else if (nextHref) router.push(nextHref);
            }}
            onClick={() => { if (Date.now() - lastTouchTime.current > 450) { showControls(); void togglePlayback(); } }}
          >
            {subtitleTracks.map((track) => (
              <track
                key={track.language}
                kind="subtitles"
                srcLang={track.language}
                label={track.label}
                src={track.blobUrl || track.url}
              />
            ))}
          </video>
        )}

        <div
          className={`pf-player-top absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 bg-gradient-to-b from-black/85 via-black/35 to-transparent px-4 pb-10 pt-3 transition-opacity md:px-6 md:pt-4 ${
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-accent">Now playing</p>
            <h1 className="mt-1 max-w-3xl truncate text-lg font-bold md:text-2xl">{title}</h1>
            {subtitle && <p className="mt-1 truncate text-xs text-zinc-400 md:text-sm">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {(onNext || nextHref) && (onNext ? (
              <button type="button" onClick={onNext} className="media-focus inline-flex min-h-10 items-center gap-2 rounded-md border border-white/20 bg-black/50 px-3 text-xs text-white">
                Next <SkipForward size={16}/>
              </button>
            ) : (
              <Link href={nextHref!} className="media-focus inline-flex min-h-10 items-center gap-2 rounded-md border border-white/20 bg-black/50 px-3 text-xs text-white">
                Next <SkipForward size={16}/>
              </Link>
            ))}
            {onClose ? (
              <button type="button" onClick={onClose} aria-label="Return to movie details"
                className="media-focus grid h-10 w-10 place-items-center rounded-md border border-white/20 bg-black/50 text-white">
                <X size={20}/>
              </button>
            ) : (
              <Link href={backHref} aria-label="Close player"
                className="media-focus grid h-10 w-10 place-items-center rounded-md border border-white/20 bg-black/50 text-white">
                <X size={20}/>
              </Link>
            )}
          </div>
        </div>

        {isBusy && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/40 text-center">
            <div>
              <LoaderCircle size={32} className="mx-auto animate-spin" />
              <p className="mt-4 text-xs font-bold uppercase tracking-[.18em] text-accent">
                {displayStatus === "switching" ? "Trying another source" : "Loading stream"}
              </p>
            </div>
          </div>
        )}

        {fullscreenMessage && <p role="status" className="absolute left-4 top-24 z-30 max-w-[75%] rounded-md border border-white/20 bg-black/80 px-3 py-2 text-xs text-white">{fullscreenMessage}</p>}

        {displayBuffering && displayStatus === "ready" && !isEmbed && (
          <div className="pointer-events-none absolute left-4 top-24 z-20 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur">
            Buffering…
          </div>
        )}

        {displayStatus === "error" && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-black/90 p-6 text-center backdrop-blur-md">
            <div className="max-w-md">
              <p className="text-5xl">⚠</p>
              <p className="mt-4 font-semibold text-zinc-200">{error}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  className="media-focus accent-gradient inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 font-semibold"
                  onClick={() => {
                    setError("");
                    setStatus("loading");
                    setSourcePosition(0);
                    resolveStreams()
                      .then((resolved) => {
                        setSources(resolved);
                        setStatus(resolved.length ? "loading" : "error");
                        if (!resolved.length) setError("No playable sources are available.");
                      })
                      .catch((reason: Error) => {
                        setStatus("error");
                        setError(reason.message);
                      });
                  }}
                >
                  <RefreshCw size={16} />
                  Try again
                </button>
                <button
                  type="button"
                  className="media-focus min-h-11 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 font-semibold text-zinc-300 hover:bg-white/10"
                  onClick={() => onClose ? onClose() : window.history.back()}
                >
                  Back to catalog
                </button>
              </div>
            </div>
          </div>
        )}
      {touchIndicator && <div role="status" className={`pf-touch-indicator ${touchIndicator}`}>{touchIndicator === "left" ? "−5 seconds" : "+5 seconds"}</div>}
      {!displayPlaying && !isBusy && displayStatus !== "error" && !isEmbed && <button type="button" aria-label="Start playback" className="pf-center-play media-focus" onClick={() => void togglePlayback()}><Play size={28} fill="currentColor" /></button>}
      <div className={`pf-player-controls pf-copied-controls ${controlsVisible || !displayPlaying ? "" : "pf-controls-idle"}`}>
        {!isEmbed && <input className="pf-seek" type="range" aria-label="Seek video" min={0} max={Math.max(duration, 1)} step={0.1} value={Math.min(currentTime, duration || 1)} disabled={!duration} onChange={(event) => seekTo(Number(event.target.value) / duration)} />}
        <div className="pf-player-actions pf-control-row">
          {!isEmbed && <>
            <button type="button" aria-label={displayPlaying ? "Pause" : "Play"} onClick={() => void togglePlayback()}>{displayPlaying ? <Pause size={20}/> : <Play size={20}/>}</button>
            <button type="button" aria-label="Rewind 10 seconds" onClick={() => { const video = videoRef.current; if (video) video.currentTime = Math.max(0, video.currentTime - 10); }}><RotateCcw size={18}/></button>
            <button type="button" aria-label="Forward 10 seconds" onClick={() => { const video = videoRef.current; if (video) video.currentTime = Math.min(duration, video.currentTime + 10); }}><RotateCw size={18}/></button>
            <span className="pf-player-time">{formatTime(currentTime)} <i>/</i> {formatTime(duration)}</span>
            <div className="pf-player-volume">
              <button type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(value => !value)}>{muted || volume === 0 ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button>
              <input type="range" aria-label="Volume" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(event) => { const value = Number(event.target.value); setVolume(value); setMuted(value === 0); }}/>
            </div>
          </>}
          {isEmbed && (
            <p className="px-3 text-xs text-zinc-400">
              Playing via movibox.net player · switch quality above if available
            </p>
          )}

          <div className="pf-player-settings">
            {!isEmbed && <select aria-label="Playback speed" value={playbackRate} onChange={(event) => { const rate = Number(event.target.value); setPlaybackRate(rate); window.localStorage.setItem("pinflix-playback-rate", String(rate)); }}>{[0.5,0.75,1,1.25,1.5,1.75,2].map(rate => <option key={rate} value={rate}>{rate}x</option>)}</select>}
            {(sources.length > 1 || hlsLevels.length > 1) && <select aria-label="Video quality" value={hlsLevels.length ? `level:${selectedLevel}` : `source:${sourcePosition}`} onChange={(event) => { const [kind, value] = event.target.value.split(":"); if (kind === "level") chooseLevel(Number(value)); else chooseSource(Number(value)); }}>
              {sources.map((item,index) => <option key={index} value={`source:${index}`}>{item.quality}</option>)}
              {hlsLevels.length > 0 && <option value="level:-1">Auto</option>}
              {hlsLevels.map(level => <option key={level.index} value={`level:${level.index}`}>{level.label}</option>)}
            </select>}
            {!isEmbed && audioTracks.length > 1 && <select aria-label="Audio track" value={selectedAudio} onChange={(event) => {
              const index = Number(event.target.value);
              if (hlsRef.current) hlsRef.current.audioTrack = index;
              else {
                const tracks = (videoRef.current as VideoWithAudio | null)?.audioTracks;
                if (tracks) Array.from(tracks).forEach((track, position) => { track.enabled = position === index; });
              }
              setSelectedAudio(index);
            }}>{selectedAudio < 0 && <option value={-1}>Default audio</option>}{audioTracks.map(track => <option key={track.index} value={track.index}>{track.label}</option>)}</select>}
            {!isEmbed && subtitleTracks.length > 0 && <select aria-label="Subtitles" value={selectedSubtitle} onChange={(event) => void chooseSubtitle(event.target.value)}><option value="off">Subtitles off</option>{subtitleTracks.map(track => <option key={track.language} value={track.language}>{track.label}</option>)}</select>}
          </div>
          {!isEmbed && (
            <button
              type="button"
              aria-label="Picture in picture"
              className="media-focus grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-white/10"
              onClick={() => void togglePiP()}
            >
              <PictureInPicture2 size={18} />
            </button>
          )}

          {!isEmbed && (
            <button type="button" aria-label={`Video fit: ${fit}`} title={`Video fit: ${fit}`} onClick={() => setFit(value => value === "contain" ? "cover" : value === "cover" ? "fill" : "contain")}><Tv size={18}/></button>
          )}
          <button type="button" aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen and rotate to landscape"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen · landscape where supported"}
            className="media-focus grid min-h-11 min-w-11 place-items-center rounded-md border border-white/20 hover:bg-white/10"
            onClick={() => void toggleFullscreen()}>
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
