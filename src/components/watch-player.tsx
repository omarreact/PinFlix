"use client";

import { useEffect, useRef, useState } from "react";
import { Captions, ChevronDown, Maximize, Pause, Play, RefreshCw, Volume2, VolumeX } from "lucide-react";

type ResolvedSubtitle = { label: string; language: string; url: string };
type ResolvedSource = {
  url: string;
  quality: string;
  protocol: "hls" | "native";
  priority: number;
  sourceIndex: number;
  subtitles?: ResolvedSubtitle[];
};
type HlsLevel = { index: number; label: string };

export function WatchPlayer({
  mediaId,
  posterLabel,
  season,
  episode,
}: {
  mediaId: string;
  posterLabel: string;
  season?: number;
  episode?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const failoverRef = useRef<() => void>(() => undefined);
  const qualityMenuRef = useRef<HTMLDivElement>(null);
  const subtitleMenuRef = useRef<HTMLDivElement>(null);
  const [sources, setSources] = useState<ResolvedSource[]>([]);
  const [sourcePosition, setSourcePosition] = useState(0);
  const [hlsLevels, setHlsLevels] = useState<HlsLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<ResolvedSubtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState("off");
  const [playing, setPlaying] = useState(false);
  // Start muted so browsers allow autoplay; user can unmute with the control or M key.
  const [muted, setMuted] = useState(true);
  const [buffering, setBuffering] = useState(true);
  const [status, setStatus] = useState<"loading" | "ready" | "switching" | "error">("loading");
  const [error, setError] = useState("");
  const [qualityOpen, setQualityOpen] = useState(false);
  const [subtitleOpen, setSubtitleOpen] = useState(false);

  const source = sources[sourcePosition];

  useEffect(() => {
    const savedQuality = window.localStorage.getItem("pinflix-quality");
    const params = new URLSearchParams({ id: mediaId });
    if (season) params.set("season", String(season));
    if (episode) params.set("episode", String(episode));

    fetch(`/api/resolve?${params.toString()}`).then(async (response) => {
      const data = await response.json() as { sources?: ResolvedSource[]; error?: string; code?: string };
      if (!response.ok) throw new Error(data.error || "Unable to resolve this stream.");
      const resolved = data.sources ?? [];

      if (savedQuality) {
        const savedPosition = resolved.findIndex((item) => item.quality === savedQuality);
        if (savedPosition >= 0) setSourcePosition(savedPosition);
      }
      setSources(resolved);
      setStatus(resolved.length ? "loading" : "error");
      if (!resolved.length) setError("No playable sources are available.");
    }).catch((reason: Error) => { setStatus("error"); setError(reason.message); });
  }, [mediaId, episode, season]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;
    let cancelled = false;
    setStatus("loading");
    setBuffering(true);
    setError("");
    setHlsLevels([]);
    setSelectedLevel(-1);
    setSubtitleTracks(source.subtitles ?? []);
    setSelectedSubtitle("off");
    hlsRef.current?.destroy();
    hlsRef.current = null;

    const playResolved = () => {
      if (cancelled) return;
      // Force muted for the initial play attempt so browsers allow autoplay.
      video.muted = true;
      setMuted(true);
      video.play()
        .then(() => {
          setPlaying(true);
          setStatus("ready");
          setBuffering(false);
        })
        .catch(() => {
          // Autoplay may still be blocked; mark ready so UI is usable and user can press Play.
          setStatus("ready");
          setBuffering(false);
          setPlaying(false);
        });
    };
    const failover = () => {
      if (cancelled) return;
      const nextPosition = sourcePosition + 1;
      if (nextPosition < sources.length) {
        setStatus("switching");
        setSourcePosition(nextPosition);
      } else {
        setStatus("error");
        setError("Playback is unavailable right now.");
      }
    };
    failoverRef.current = failover;

    if (source.protocol === "hls" && !video.canPlayType("application/vnd.apple.mpegurl")) {
      void import("hls.js").then(({ default: Hls }) => {
        if (cancelled || !Hls.isSupported()) { failover(); return; }
        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          if (cancelled) return;
          setHlsLevels(data.levels.map((level, index) => ({ index, label: level.height ? `${level.height}p` : `Level ${index + 1}` })));
          playResolved();
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) failover();
        });
        hls.loadSource(source.url);
        hls.attachMedia(video);
      }).catch(() => failover());
    } else {
      video.src = source.url;
      video.load();
      playResolved();
    }
    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
      failoverRef.current = () => undefined;
    };
  }, [mediaId, source, sourcePosition, sources.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if (event.key === "Escape") { setQualityOpen(false); setSubtitleOpen(false); return; }
      if (event.key === " " || event.key.toLowerCase() === "k") { event.preventDefault(); void togglePlayback(); }
      if (event.key === "ArrowRight") video.currentTime += 10;
      if (event.key === "ArrowLeft") video.currentTime = Math.max(0, video.currentTime - 10);
      if (event.key.toLowerCase() === "m") setMuted((value) => !value);
      if (event.key.toLowerCase() === "f") void video.requestFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      if (!qualityMenuRef.current?.contains(event.target as Node)) setQualityOpen(false);
      if (!subtitleMenuRef.current?.contains(event.target as Node)) setSubtitleOpen(false);
    };
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { await video.play(); setPlaying(true); } else { video.pause(); setPlaying(false); }
  }

  function chooseSource(position: number) {
    window.localStorage.setItem("pinflix-quality", sources[position]?.quality ?? "");
    setQualityOpen(false);
    setSourcePosition(position);
  }

  function chooseLevel(index: number) {
    if (hlsRef.current) hlsRef.current.currentLevel = index;
    setSelectedLevel(index);
    window.localStorage.setItem("pinflix-quality", hlsLevels.find((level) => level.index === index)?.label ?? "");
    setQualityOpen(false);
  }

  function chooseSubtitle(value: string) {
    setSelectedSubtitle(value);
    setSubtitleOpen(false);
    const tracks = videoRef.current?.textTracks;
    if (tracks) for (let index = 0; index < tracks.length; index += 1) tracks[index].mode = tracks[index].language === value ? "showing" : "hidden";
  }

  const isBusy = status === "loading" || status === "switching";
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="relative min-h-[calc(100vh-72px)]">
        <video
          ref={videoRef}
          muted={muted}
          controls={false}
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-contain bg-black"
          aria-label={`Player for ${mediaId}`}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => { setBuffering(false); setStatus("ready"); }}
          onCanPlay={() => {
            setBuffering(false);
            setStatus((current) => (current === "loading" ? "ready" : current));
          }}
          onLoadedData={() => setBuffering(false)}
          onError={() => failoverRef.current()}
        />

        {subtitleTracks.map((track) => (
          <track key={track.language} kind="subtitles" srcLang={track.language} label={track.label} src={track.url} />
        ))}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/90 via-black/35 to-transparent px-5 pb-16 pt-5 md:px-8">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-accent">Now playing</p>
          <h1 className="mt-1 max-w-3xl truncate text-lg font-bold md:text-2xl">{posterLabel}</h1>
        </div>

        {isBusy && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/75 text-center backdrop-blur-sm">
            <div>
              <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-white/10 border-t-brand" />
              <p className="mt-4 text-xs font-bold uppercase tracking-[.18em] text-accent">
                {status === "switching" ? "Trying another source" : "Loading stream"}
              </p>
            </div>
          </div>
        )}

        {buffering && status === "ready" && (
          <div className="pointer-events-none absolute left-4 top-24 z-20 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur">
            Buffering…
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-black/90 p-6 text-center backdrop-blur-md">
            <div className="max-w-md">
              <p className="text-5xl">⚠</p>
              <p className="mt-4 font-semibold text-zinc-200">{error}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  className="tv-focus accent-gradient inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 font-semibold"
                  onClick={() => { setError(""); setStatus("loading"); setSourcePosition(0); }}
                >
                  <RefreshCw size={16} />
                  Try again
                </button>
                <button
                  type="button"
                  className="tv-focus min-h-11 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 font-semibold text-zinc-300 hover:bg-white/10"
                  onClick={() => window.history.back()}
                >
                  Back to catalog
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative z-40 flex min-h-[72px] flex-wrap items-center gap-1 border-t border-white/10 bg-[#08080b] px-3 md:px-6">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          className="tv-focus grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-white/10"
          onClick={() => void togglePlayback()}
        >
          {playing ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
        </button>

        <button
          type="button"
          aria-label={muted ? "Unmute" : "Mute"}
          className="tv-focus grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-white/10"
          onClick={() => setMuted((value) => !value)}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {(sources.length > 1 || hlsLevels.length > 1) && (
          <div ref={qualityMenuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={qualityOpen}
              className="tv-focus inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-semibold text-zinc-300 hover:bg-white/10"
              onClick={() => { setQualityOpen((value) => !value); setSubtitleOpen(false); }}
            >
              {hlsLevels[selectedLevel]?.label ?? source?.quality ?? "Auto"}
              <ChevronDown size={14} />
            </button>
            {qualityOpen && (
              <div role="menu" className="absolute bottom-14 left-0 z-50 min-w-40 rounded-2xl border border-white/10 bg-panel/95 p-1.5 shadow-2xl backdrop-blur-xl">
                {sources.map((item, index) => (
                  <button
                    key={`${item.quality}-${item.sourceIndex}`}
                    type="button"
                    role="menuitem"
                    className="tv-focus flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-zinc-300 hover:bg-white/10"
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
                    className="tv-focus flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-zinc-300 hover:bg-white/10"
                    onClick={() => chooseLevel(level.index)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {subtitleTracks.length > 0 && (
          <div ref={subtitleMenuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={subtitleOpen}
              aria-label={`Subtitles: ${selectedSubtitle === "off" ? "off" : selectedSubtitle}`}
              className="tv-focus inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-semibold text-zinc-300 hover:bg-white/10"
              onClick={() => { setSubtitleOpen((value) => !value); setQualityOpen(false); }}
            >
              <Captions size={18} />
              <ChevronDown size={14} />
            </button>
            {subtitleOpen && (
              <div role="menu" className="absolute bottom-14 left-0 z-50 min-w-40 rounded-2xl border border-white/10 bg-panel/95 p-1.5 shadow-2xl backdrop-blur-xl">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={selectedSubtitle === "off"}
                  className="tv-focus flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-zinc-300 hover:bg-white/10"
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
                    className="tv-focus flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-zinc-300 hover:bg-white/10"
                    onClick={() => chooseSubtitle(track.language)}
                  >
                    {track.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <span className="ml-auto hidden px-3 text-xs text-zinc-500 sm:inline">
          {status === "switching" ? "Switching source…" : source?.quality ?? "Auto"}
        </span>

        <button
          type="button"
          aria-label="Fullscreen"
          className="tv-focus grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-white/10"
          onClick={() => void videoRef.current?.requestFullscreen()}
        >
          <Maximize size={20} />
        </button>
      </div>
    </div>
  );
}
