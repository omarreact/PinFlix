"use client";

import { useEffect, useRef, useState } from "react";
import { Captions, ChevronDown, Maximize, Pause, Play, RefreshCw, Volume2, VolumeX } from "lucide-react";

type ResolvedSubtitle = { label: string; language: string; url: string };
type ResolvedSource = {
  url: string;
  quality: string;
  protocol: "hls" | "native" | "mpegts";
  priority: number;
  sourceIndex: number;
  subtitles?: ResolvedSubtitle[];
};
type HlsLevel = { index: number; label: string };

export function WatchPlayer({ channelId, posterLabel }: { channelId: string; posterLabel: string }) {
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
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [status, setStatus] = useState<"loading" | "ready" | "switching" | "error">("loading");
  const [error, setError] = useState("");
  const [qualityOpen, setQualityOpen] = useState(false);
  const [subtitleOpen, setSubtitleOpen] = useState(false);

  const source = sources[sourcePosition];

  useEffect(() => {
    const savedQuality = window.localStorage.getItem("pinflix-quality");
    fetch(`/api/resolve?channelId=${encodeURIComponent(channelId)}`).then(async (response) => {
      if (!response.ok) throw new Error("Unable to resolve this stream.");
      const data = await response.json() as { sources: ResolvedSource[] };
      const resolved = data.sources ?? [];
      if (savedQuality) {
        const savedPosition = resolved.findIndex((item) => item.quality === savedQuality);
        if (savedPosition >= 0) setSourcePosition(savedPosition);
      }
      setSources(resolved);
      setStatus(resolved.length ? "loading" : "error");
      if (!resolved.length) setError("No playable sources are available.");
    }).catch((reason: Error) => { setStatus("error"); setError(reason.message); });
  }, [channelId]);

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

    const report = (success: boolean) => {
      void fetch("/api/health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId, sourceIndex: source.sourceIndex, success }) });
    };
    const playResolved = () => {
      if (cancelled) return;
      video.play().then(() => { setPlaying(true); setStatus("ready"); report(true); }).catch(() => setStatus("ready"));
    };
    const failover = () => {
      if (cancelled) return;
      report(false);
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
  }, [channelId, source, sourcePosition, sources.length]);

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
  return <div className="overflow-hidden rounded-xl border border-border bg-black">
    <div className="relative aspect-video">
      <video ref={videoRef} muted={muted} controls={false} playsInline className="h-full w-full object-contain" aria-label={`Player for ${channelId}`} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onWaiting={() => setBuffering(true)} onPlaying={() => { setBuffering(false); setStatus("ready"); }} onError={() => failoverRef.current()} />
      {subtitleTracks.map((track) => <track key={track.language} kind="subtitles" srcLang={track.language} label={track.label} src={track.url} />)}
      {isBusy && <div className="absolute inset-0 grid place-items-center bg-[#05070a]/80 text-center"><div><div className="text-6xl">{posterLabel}</div><p className="mt-4 font-semibold">{status === "switching" ? "Switching source…" : "Loading stream…"}</p></div></div>}
      {buffering && status === "ready" && <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs text-muted">Buffering…</div>}
      {status === "error" && <div className="absolute inset-0 grid place-items-center bg-[#05070a]/90 p-6 text-center"><div><p className="font-semibold text-danger">{error}</p><button type="button" className="tv-focus mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-4 py-2 font-semibold" onClick={() => { setError(""); setStatus("loading"); setSourcePosition(0); }}><RefreshCw size={16} />Try again</button></div></div>}
    </div>
    <div className="flex min-h-14 flex-wrap items-center gap-1 border-t border-border bg-surface px-2 sm:px-3">
      <button type="button" aria-label={playing ? "Pause" : "Play"} className="tv-focus grid min-h-11 min-w-11 place-items-center rounded-md hover:bg-elevated" onClick={() => void togglePlayback()}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
      <button type="button" aria-label={muted ? "Unmute" : "Mute"} className="tv-focus grid min-h-11 min-w-11 place-items-center rounded-md hover:bg-elevated" onClick={() => setMuted((value) => !value)}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      {(sources.length > 1 || hlsLevels.length > 1) && <div ref={qualityMenuRef} className="relative"><button type="button" aria-haspopup="menu" aria-expanded={qualityOpen} className="tv-focus inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-xs font-semibold hover:bg-elevated" onClick={() => { setQualityOpen((value) => !value); setSubtitleOpen(false); }}>{hlsLevels[selectedLevel]?.label ?? source?.quality ?? "Auto"}<ChevronDown size={14} /></button>{qualityOpen && <div role="menu" className="absolute bottom-12 left-0 z-10 min-w-32 rounded-md border border-border bg-panel p-1 shadow-xl">{sources.map((item, index) => <button key={`${item.quality}-${item.sourceIndex}`} type="button" role="menuitem" className="tv-focus flex min-h-11 w-full items-center rounded px-3 text-left text-sm hover:bg-elevated" onClick={() => chooseSource(index)}>{item.quality}</button>)}{hlsLevels.map((level) => <button key={level.index} type="button" role="menuitem" className="tv-focus flex min-h-11 w-full items-center rounded px-3 text-left text-sm hover:bg-elevated" onClick={() => chooseLevel(level.index)}>{level.label}</button>)}</div>}</div>}
      {subtitleTracks.length > 0 && <div ref={subtitleMenuRef} className="relative"><button type="button" aria-haspopup="menu" aria-expanded={subtitleOpen} aria-label={`Subtitles: ${selectedSubtitle === "off" ? "off" : selectedSubtitle}`} className="tv-focus inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-xs font-semibold hover:bg-elevated" onClick={() => { setSubtitleOpen((value) => !value); setQualityOpen(false); }}><Captions size={16} /><ChevronDown size={14} /></button>{subtitleOpen && <div role="menu" className="absolute bottom-12 left-0 z-10 min-w-36 rounded-md border border-border bg-panel p-1 shadow-xl"><button type="button" role="menuitemradio" aria-checked={selectedSubtitle === "off"} className="tv-focus flex min-h-11 w-full items-center rounded px-3 text-left text-sm hover:bg-elevated" onClick={() => chooseSubtitle("off")}>Off</button>{subtitleTracks.map((track) => <button key={track.language} type="button" role="menuitemradio" aria-checked={selectedSubtitle === track.language} className="tv-focus flex min-h-11 w-full items-center rounded px-3 text-left text-sm hover:bg-elevated" onClick={() => chooseSubtitle(track.language)}>{track.label}</button>)}</div>}</div>}
      <span className="ml-auto px-2 text-xs text-muted">{status === "switching" ? "Switching source…" : source?.quality ?? "Auto"}</span>
      <button type="button" aria-label="Fullscreen" className="tv-focus grid min-h-11 min-w-11 place-items-center rounded-md hover:bg-elevated" onClick={() => void videoRef.current?.requestFullscreen()}><Maximize size={18} /></button>
    </div>
  </div>;
}
