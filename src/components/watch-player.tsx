"use client";

import Link from "next/link";
import { saveProgress } from "@/src/lib/history";
import type { SavedTitle } from "@/src/lib/saved";
import { toWebVtt } from "@/src/lib/subtitles";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Captions,
  ChevronDown,
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
    const vttText = toWebVtt(srtText);
    return URL.createObjectURL(new Blob([vttText], { type: "text/vtt" }));
  } catch (error) {
    console.error("Subtitle load error:", error);
    return "";
  }
}

export function WatchPlayer({
  mediaId,
  historyItem,
  title,
  subtitle,
  backHref,
  nextHref,
  season,
  episode,
}: {
  mediaId: string;
  historyItem?: SavedTitle;
  title: string;
  subtitle?: string;
  backHref: string;
  nextHref?: string;
  season?: number;
  episode?: number;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const refreshAttemptsRef = useRef(0);
  const subtitleBlobUrlsRef = useRef<string[]>([]);
  const failoverRef = useRef<() => void>(() => undefined);
  const qualityMenuRef = useRef<HTMLDivElement>(null);
  const subtitleMenuRef = useRef<HTMLDivElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const [sources, setSources] = useState<ResolvedSource[]>([]);
  const [sourcePosition, setSourcePosition] = useState(0);
  const [hlsLevels, setHlsLevels] = useState<HlsLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<ResolvedSubtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState("off");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.9);
  const [buffering, setBuffering] = useState(true);
  const [status, setStatus] = useState<"loading" | "ready" | "switching" | "error">("loading");
  const [error, setError] = useState("");
  const [qualityOpen, setQualityOpen] = useState(false);
  const [subtitleOpen, setSubtitleOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    subtitleBlobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

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
    hideTimer.current = setTimeout(() => {
      if (displayPlaying && !qualityOpen && !subtitleOpen && !speedOpen) setControlsVisible(false);
    }, 3200);
  }, [displayPlaying, qualityOpen, subtitleOpen, speedOpen]);

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

      const resumeKey = `pinflix-resume-${mediaId}-${season || 0}-${episode || 0}`;
      const savedTime = Number(window.localStorage.getItem(resumeKey));
      if (savedTime > 5 && video.currentTime === 0) {
        video.currentTime = savedTime;
      }

      video
        .play()
        .then(() => {
          if (cancelled) return;
          setPlaying(true);
          setStatus("ready");
          setBuffering(false);
        })
        .catch(() => {
          if (cancelled) return;
          setStatus("ready");
          setBuffering(false);
          setPlaying(false);
        });
    };

    let isRefreshing = false;
    const failover = () => {
      if (cancelled || isRefreshing) return;

      if (video.currentTime > 5 && sourcePosition + 1 >= sources.length && refreshAttemptsRef.current < 1) {
        refreshAttemptsRef.current += 1;
        isRefreshing = true;
        setStatus("switching");
        const resumeKey = `pinflix-resume-${mediaId}-${season || 0}-${episode || 0}`;
        window.localStorage.setItem(resumeKey, String(video.currentTime));

        resolveStreams()
          .then((resolved) => {
            if (cancelled) return;
            if (resolved.length > 0) setSources(resolved);
            else {
              setStatus("error");
              setError("Playback is unavailable right now.");
            }
          })
          .catch((reason: Error) => {
            if (cancelled) return;
            setStatus("error");
            setError(reason.message);
          });
        return;
      }

      const nextPosition = sourcePosition + 1;
      if (video.currentTime > 0) window.localStorage.setItem(`pinflix-resume-${mediaId}-${season || 0}-${episode || 0}`, String(video.currentTime));
      if (nextPosition < sources.length) {
        setStatus("switching");
        setSourcePosition(nextPosition);
      } else {
        setStatus("error");
        setError("Playback is unavailable right now.");
      }
    };
    failoverRef.current = failover;
    const startupTimeout = window.setTimeout(() => {
      if (!cancelled && video.readyState < 2) failover();
    }, 15_000);

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
            setHlsLevels(
              data.levels.map((level, index) => ({
                index,
                label: level.height ? `${level.height}p` : `Level ${index + 1}`,
              })),
            );
            playResolved();
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
      video.addEventListener("loadedmetadata", playResolved, { once: true });
      video.load();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(boot);
      window.clearTimeout(startupTimeout);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeEventListener("loadedmetadata", playResolved);
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
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      showControls();
      if (event.key === "Escape") {
        setQualityOpen(false);
        setSubtitleOpen(false);
        setSpeedOpen(false);
        return;
      }
      if (event.key === " " || event.key.toLowerCase() === "k") {
        event.preventDefault();
        void togglePlayback();
      }
      if (event.key === "ArrowRight") video.currentTime = Math.min(duration, video.currentTime + 10);
      if (event.key === "ArrowLeft") video.currentTime = Math.max(0, video.currentTime - 10);
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

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      if (!qualityMenuRef.current?.contains(event.target as Node)) setQualityOpen(false);
      if (!subtitleMenuRef.current?.contains(event.target as Node)) setSubtitleOpen(false);
      if (!speedMenuRef.current?.contains(event.target as Node)) setSpeedOpen(false);
    };
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || isEmbed) return;
    if (video.paused) {
      try { await video.play(); } catch {
        setPlaying(false);
        setError("Playback could not start. Try another source.");
      }
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  async function toggleFullscreen() {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shell.requestFullscreen();
  }

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
    window.localStorage.setItem("pinflix-quality", sources[position]?.quality ?? "");
    const video = videoRef.current;
    if (video && video.currentTime > 0) window.localStorage.setItem(`pinflix-resume-${mediaId}-${season || 0}-${episode || 0}`, String(video.currentTime));
    setQualityOpen(false);
    setSourcePosition(position);
  }

  function chooseLevel(index: number) {
    if (hlsRef.current) hlsRef.current.currentLevel = index;
    setSelectedLevel(index);
    window.localStorage.setItem(
      "pinflix-quality",
      hlsLevels.find((level) => level.index === index)?.label ?? "",
    );
    setQualityOpen(false);
  }

  async function chooseSubtitle(value: string) {
    setSelectedSubtitle(value);
    setSubtitleOpen(false);

    const trackObj = subtitleTracks.find((t) => t.language === value);
    if (trackObj && !trackObj.blobUrl && trackObj.url) {
      const blobUrl = await srtToVttBlobUrl(trackObj.url);
      if (blobUrl) subtitleBlobUrlsRef.current.push(blobUrl);
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
  const progress = duration > 0 ? currentTime / duration : 0;
  const bufferRatio = duration > 0 ? buffered / duration : 0;

  return (
    <div
      ref={shellRef}
      className="relative min-h-screen overflow-hidden bg-black text-white"
      onMouseMove={showControls}
      onClick={showControls}
    >
      <div className="relative min-h-[calc(100vh-88px)]">
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
            preload="auto"
            className="absolute inset-0 h-full w-full object-contain bg-black"
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
              setCurrentTime(video.currentTime);
              if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
              }
              const resumeKey = `pinflix-resume-${mediaId}-${season || 0}-${episode || 0}`;
              if (Math.floor(video.currentTime) % 5 === 0) {
                window.localStorage.setItem(resumeKey, String(video.currentTime));
                if (historyItem && Number.isFinite(video.duration)) saveProgress({ ...historyItem, season, episode, position: video.currentTime, duration: video.duration, updatedAt: Date.now(), completed: false });
              }
            }}
            onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onError={() => failoverRef.current()}
            onEnded={() => {
              const video = videoRef.current;
              if (historyItem && video && Number.isFinite(video.duration)) saveProgress({ ...historyItem, season, episode, position: video.duration, duration: video.duration, updatedAt: Date.now(), completed: true });
              window.localStorage.removeItem(`pinflix-resume-${mediaId}-${season || 0}-${episode || 0}`);
              if (nextHref) router.push(nextHref);
            }}
            onClick={() => void togglePlayback()}
          >
            {subtitleTracks.map((track) => (
              <track key={track.language} kind="subtitles" srcLang={track.language} label={track.label} src={track.blobUrl || track.url} />
            ))}
          </video>
        )}



        <div
          className={`absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 bg-gradient-to-b from-black/90 via-black/35 to-transparent px-4 pb-16 pt-4 transition-opacity md:px-8 md:pt-6 ${
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-accent">Now playing</p>
            <h1 className="mt-1 max-w-3xl truncate text-lg font-bold md:text-2xl">{title}</h1>
            {subtitle && <p className="mt-1 truncate text-xs text-zinc-400 md:text-sm">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {nextHref && (
              <Link
                href={nextHref}
                className="media-focus hidden min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur hover:bg-white/15 sm:inline-flex"
              >
                Next episode
                <SkipForward size={16} />
              </Link>
            )}
            <Link
              href={backHref}
              aria-label="Close player"
              className="media-focus grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur hover:bg-white/15"
            >
              <X size={20} />
            </Link>
          </div>
        </div>

        {isBusy && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/75 text-center backdrop-blur-sm">
            <div>
              <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-white/10 border-t-brand" />
              <p className="mt-4 text-xs font-bold uppercase tracking-[.18em] text-accent">
                {displayStatus === "switching" ? "Trying another source" : "Loading stream"}
              </p>
            </div>
          </div>
        )}

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
                  onClick={() => window.history.back()}
                >
                  Back to catalog
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className={`relative z-40 border-t border-white/10 bg-[#08080b]/95 backdrop-blur transition-opacity ${
          controlsVisible ? "opacity-100" : "opacity-80"
        }`}
      >
        {!isEmbed && (
          <div className="px-3 pt-2 md:px-6">
            <div
              className="group relative h-1.5 cursor-pointer rounded-full bg-white/15"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seekTo((e.clientX - rect.left) / rect.width);
              }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/25"
                style={{ width: `${bufferRatio * 100}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent"
                style={{ width: `${progress * 100}%` }}
              />
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow opacity-0 transition group-hover:opacity-100"
                style={{ left: `calc(${progress * 100}% - 7px)` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-zinc-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        <div className="flex min-h-[56px] flex-wrap items-center gap-0.5 px-2 py-1 md:px-4">
          {!isEmbed && (
            <>
              <button
                type="button"
                aria-label={displayPlaying ? "Pause" : "Play"}
                className="media-focus grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-white/10"
                onClick={() => void togglePlayback()}
              >
                {displayPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
              </button>

              <button
                type="button"
                aria-label="Rewind 10 seconds"
                className="media-focus grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-white/10"
                onClick={() => {
                  const v = videoRef.current;
                  if (v) v.currentTime = Math.max(0, v.currentTime - 10);
                }}
              >
                <RotateCcw size={18} />
              </button>

              <button
                type="button"
                aria-label="Forward 10 seconds"
                className="media-focus grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-white/10"
                onClick={() => {
                  const v = videoRef.current;
                  if (v) v.currentTime = Math.min(duration, v.currentTime + 10);
                }}
              >
                <RotateCw size={18} />
              </button>

              <button
                type="button"
                aria-label={muted ? "Unmute" : "Mute"}
                className="media-focus grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-white/10"
                onClick={() => setMuted((value) => !value)}
              >
                {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                aria-label="Volume"
                className="hidden w-24 accent-[var(--pinflix-accent,#e63946)] sm:block"
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setVolume(next);
                  setMuted(next === 0);
                }}
              />
            </>
          )}

          {isEmbed && (
            <p className="px-3 text-xs text-zinc-400">
              Switch quality above if available
            </p>
          )}

          {(sources.length > 1 || hlsLevels.length > 1) && (
            <div ref={qualityMenuRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={qualityOpen}
                className="media-focus inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-semibold text-zinc-300 hover:bg-white/10"
                onClick={() => {
                  setQualityOpen((value) => !value);
                  setSubtitleOpen(false);
                  setSpeedOpen(false);
                }}
              >
                {hlsLevels[selectedLevel]?.label ?? source?.quality ?? "Auto"}
                <ChevronDown size={14} />
              </button>
              {qualityOpen && (
                <div
                  role="menu"
                  className="absolute bottom-14 left-0 z-50 max-h-64 min-w-44 overflow-auto rounded-2xl border border-white/10 bg-panel/95 p-1.5 shadow-2xl backdrop-blur-xl"
                >
                  {sources.map((item, index) => (
                    <button
                      key={`${item.quality}-${item.sourceIndex}`}
                      type="button"
                      role="menuitem"
                      className={`media-focus flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm hover:bg-white/10 ${
                        index === sourcePosition ? "text-accent" : "text-zinc-300"
                      }`}
                      onClick={() => chooseSource(index)}
                    >
                      {item.quality}
                    </button>
                  ))}
                  {hlsLevels.map((level) => (
                    <button
                      key={level.index}
                      type="button"
                      role="menuitem"
                      className="media-focus flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-zinc-300 hover:bg-white/10"
                      onClick={() => chooseLevel(level.index)}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isEmbed && subtitleTracks.length > 0 && (
            <div ref={subtitleMenuRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={subtitleOpen}
                aria-label={`Subtitles: ${selectedSubtitle === "off" ? "off" : selectedSubtitle}`}
                className="media-focus inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-semibold text-zinc-300 hover:bg-white/10"
                onClick={() => {
                  setSubtitleOpen((value) => !value);
                  setQualityOpen(false);
                  setSpeedOpen(false);
                }}
              >
                <Captions size={18} />
                <ChevronDown size={14} />
              </button>
              {subtitleOpen && (
                <div
                  role="menu"
                  className="absolute bottom-14 left-0 z-50 min-w-40 rounded-2xl border border-white/10 bg-panel/95 p-1.5 shadow-2xl backdrop-blur-xl"
                >
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={selectedSubtitle === "off"}
                    className="media-focus flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-zinc-300 hover:bg-white/10"
                    onClick={() => chooseSubtitle("off")}
                  >
                    Off
                  </button>
                  {subtitleTracks.map((track) => (
                    <button
                      key={track.language}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selectedSubtitle === track.language}
                      className="media-focus flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-zinc-300 hover:bg-white/10"
                      onClick={() => chooseSubtitle(track.language)}
                    >
                      {track.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isEmbed && (
            <div ref={speedMenuRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={speedOpen}
                className="media-focus inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-semibold text-zinc-300 hover:bg-white/10"
                onClick={() => {
                  setSpeedOpen((v) => !v);
                  setQualityOpen(false);
                  setSubtitleOpen(false);
                }}
              >
                {playbackRate}x
                <ChevronDown size={14} />
              </button>
              {speedOpen && (
                <div
                  role="menu"
                  className="absolute bottom-14 left-0 z-50 min-w-28 rounded-2xl border border-white/10 bg-panel/95 p-1.5 shadow-2xl backdrop-blur-xl"
                >
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      role="menuitemradio"
                      aria-checked={playbackRate === rate}
                      className={`media-focus flex min-h-10 w-full items-center rounded-xl px-3 text-left text-sm hover:bg-white/10 ${
                        playbackRate === rate ? "text-accent" : "text-zinc-300"
                      }`}
                      onClick={() => {
                        setPlaybackRate(rate);
                        setSpeedOpen(false);
                      }}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <span className="ml-auto hidden px-2 text-xs text-zinc-500 sm:inline">
            {displayStatus === "switching" ? "Switching…" : source?.quality ?? "Auto"}
          </span>

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

          <button
            type="button"
            aria-label="Fullscreen"
            className="media-focus grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-white/10"
            onClick={() => void toggleFullscreen()}
          >
            {typeof document !== "undefined" && document.fullscreenElement ? (
              <Minimize size={20} />
            ) : (
              <Maximize size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
