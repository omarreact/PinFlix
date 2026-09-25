"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_SOURCE = "http://vod.cineplexbd.net:8081/movies/Hindi%20Dubbed/Tamil%20Movies/2026/Irumudi%20%282026%29%201080P/Irumudi%20%282026%29%20WEB-DL%20%5BHindi-Telugu%5D%20NF%201080p%20ESub.mp4/index.m3u8";

type LogEntry = { time: string; message: string };

type HlsErrorLog = {
  type?: string;
  details?: string;
  fatal?: boolean;
  code?: number;
  url?: string;
};

export default function HlsDebugPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [sourceUrl, setSourceUrl] = useState(DEFAULT_SOURCE);
  const [currentSource, setCurrentSource] = useState(DEFAULT_SOURCE);
  const [status, setStatus] = useState("idle");
  const [detectedProtocol, setDetectedProtocol] = useState("unknown");
  const [events, setEvents] = useState<LogEntry[]>([]);
  const [hlsErrors, setHlsErrors] = useState<HlsErrorLog[]>([]);
  const [mediaErrors, setMediaErrors] = useState<string[]>([]);
  const [networkErrors, setNetworkErrors] = useState<string[]>([]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleError = () => {
      const mediaError = video.error;
      const message = mediaError ? `MediaError code=${mediaError.code} message=${mediaError.message}` : "MediaError encountered";
      setMediaErrors((prev) => [...prev.slice(-20), message]);
      setStatus("media-error");
    };

    const handleLoadStart = () => setEvents((prev) => [...prev.slice(-50), { time: new Date().toLocaleTimeString(), message: "loadstart" }]);
    const handleLoadedMetadata = () => setEvents((prev) => [...prev.slice(-50), { time: new Date().toLocaleTimeString(), message: "loadedmetadata" }]);
    const handleCanPlay = () => setEvents((prev) => [...prev.slice(-50), { time: new Date().toLocaleTimeString(), message: "canplay" }]);
    const handleWaiting = () => setEvents((prev) => [...prev.slice(-50), { time: new Date().toLocaleTimeString(), message: "waiting" }]);
    const handlePlaying = () => setEvents((prev) => [...prev.slice(-50), { time: new Date().toLocaleTimeString(), message: "playing" }]);

    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  const appendEvent = (message: string) => {
    setEvents((prev) => [...prev.slice(-50), { time: new Date().toLocaleTimeString(), message }]);
  };

  const stopPlayback = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  async function playDirect() {
    stopPlayback();
    const video = videoRef.current;
    if (!video) return;

    const targetUrl = sourceUrl.trim();
    setCurrentSource(targetUrl);
    setStatus("loading-direct");
    setDetectedProtocol(video.canPlayType("application/vnd.apple.mpegurl") ? "native-hls" : "not-supported");
    appendEvent(`Direct load: ${targetUrl}`);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = targetUrl;
      video.load();
      setStatus("playing-direct");
      return;
    }

    const { default: Hls } = await import("hls.js");
    if (!Hls.isSupported()) {
      setStatus("unsupported");
      setDetectedProtocol("hls.js-unavailable");
      appendEvent("HLS.js not supported in this browser.");
      return;
    }

    setDetectedProtocol("hls.js");
    const hls = new Hls({ enableWorker: true, debug: true });
    hlsRef.current = hls;

    hls.on(Hls.Events.MANIFEST_LOADING, () => appendEvent("Hls.Events.MANIFEST_LOADING"));
    hls.on(Hls.Events.MANIFEST_LOADED, () => appendEvent("Hls.Events.MANIFEST_LOADED"));
    hls.on(Hls.Events.MANIFEST_PARSED, () => appendEvent("Hls.Events.MANIFEST_PARSED"));
    hls.on(Hls.Events.LEVEL_LOADED, () => appendEvent("Hls.Events.LEVEL_LOADED"));
    hls.on(Hls.Events.FRAG_LOADING, () => appendEvent("Hls.Events.FRAG_LOADING"));
    hls.on(Hls.Events.FRAG_LOADED, () => appendEvent("Hls.Events.FRAG_LOADED"));
    hls.on(Hls.Events.ERROR, (_event, data) => {
      const details = {
        type: data.type,
        details: data.details,
        fatal: data.fatal,
        code: data.response?.code,
        url: data.url,
      };
      setHlsErrors((prev) => [...prev.slice(-25), details]);
      appendEvent(`Hls error: ${data.type} / ${String(data.details)} / fatal=${String(data.fatal)}`);
      if (data.type === "networkError") {
        setNetworkErrors((prev) => [...prev.slice(-10), `networkError ${data.details ?? "unknown"} url=${data.url ?? "n/a"}`]);
        hls.startLoad();
      }
      if (data.type === "mediaError") {
        setNetworkErrors((prev) => [...prev.slice(-10), `mediaError ${data.details ?? "unknown"} url=${data.url ?? "n/a"}`]);
        hls.recoverMediaError();
      }
      if (data.fatal) {
        setStatus("fatal-error");
        hls.destroy();
        hlsRef.current = null;
      }
    });

    hls.loadSource(targetUrl);
    hls.attachMedia(video);
    setStatus("playing-direct");
  }

  async function playThroughProxy() {
    stopPlayback();
    const video = videoRef.current;
    if (!video) return;

    const targetUrl = `/api/playback/proxy?url=${encodeURIComponent(sourceUrl.trim())}`;
    setCurrentSource(targetUrl);
    setStatus("loading-proxy");
    setDetectedProtocol(video.canPlayType("application/vnd.apple.mpegurl") ? "native-hls" : "unknown");
    appendEvent(`Proxy load: ${targetUrl}`);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = targetUrl;
      video.load();
      setStatus("playing-proxy");
      return;
    }

    const { default: Hls } = await import("hls.js");
    if (!Hls.isSupported()) {
      setStatus("unsupported");
      setDetectedProtocol("hls.js-unavailable");
      return;
    }

    setDetectedProtocol("hls.js");
    const hls = new Hls({ enableWorker: true, debug: true });
    hlsRef.current = hls;

    hls.on(Hls.Events.MANIFEST_LOADING, () => appendEvent("Hls.Events.MANIFEST_LOADING"));
    hls.on(Hls.Events.MANIFEST_LOADED, () => appendEvent("Hls.Events.MANIFEST_LOADED"));
    hls.on(Hls.Events.MANIFEST_PARSED, () => appendEvent("Hls.Events.MANIFEST_PARSED"));
    hls.on(Hls.Events.LEVEL_LOADED, () => appendEvent("Hls.Events.LEVEL_LOADED"));
    hls.on(Hls.Events.FRAG_LOADING, () => appendEvent("Hls.Events.FRAG_LOADING"));
    hls.on(Hls.Events.FRAG_LOADED, () => appendEvent("Hls.Events.FRAG_LOADED"));
    hls.on(Hls.Events.ERROR, (_event, data) => {
      const details = {
        type: data.type,
        details: data.details,
        fatal: data.fatal,
        code: data.response?.code,
        url: data.url,
      };
      setHlsErrors((prev) => [...prev.slice(-25), details]);
      appendEvent(`Hls error: ${data.type} / ${String(data.details)} / fatal=${String(data.fatal)}`);
      if (data.type === "networkError") {
        setNetworkErrors((prev) => [...prev.slice(-10), `networkError ${data.details ?? "unknown"} url=${data.url ?? "n/a"}`]);
        hls.startLoad();
      }
      if (data.type === "mediaError") {
        setNetworkErrors((prev) => [...prev.slice(-10), `mediaError ${data.details ?? "unknown"} url=${data.url ?? "n/a"}`]);
        hls.recoverMediaError();
      }
      if (data.fatal) {
        setStatus("fatal-error");
        hls.destroy();
        hlsRef.current = null;
      }
    });

    hls.loadSource(targetUrl);
    hls.attachMedia(video);
    setStatus("playing-proxy");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 text-white">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-400">PinFlix HLS diagnostics</p>
        <h1 className="mt-2 text-3xl font-black">Local HLS playback test</h1>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0a0d14] p-4">
        <label className="mb-2 block text-sm font-medium text-slate-300">Stream URL</label>
        <textarea value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className="h-28 w-full rounded-lg border border-white/10 bg-slate-950 p-3 font-mono text-sm text-slate-100" />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => void playDirect()} className="rounded-lg bg-pink-500 px-4 py-2 font-semibold text-white hover:bg-pink-400">Play Direct</button>
          <button type="button" onClick={() => void playThroughProxy()} className="rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400">Play Through Proxy</button>
          <button type="button" onClick={stopPlayback} className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800">Stop</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
          <video ref={videoRef} controls playsInline className="aspect-video w-full bg-black" />
        </div>

        <div className="space-y-4 rounded-xl border border-white/10 bg-[#0a0d14] p-4 text-sm">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</div>
            <div className="mt-1 font-semibold text-slate-50">{status}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Detected protocol</div>
            <div className="mt-1 font-semibold text-slate-50">{detectedProtocol}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Current source</div>
            <div className="mt-1 break-all font-mono text-xs text-slate-200">{currentSource}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#0a0d14] p-4">
          <h2 className="text-lg font-bold">Playback events</h2>
          <div className="mt-3 max-h-80 space-y-2 overflow-auto pr-1 text-xs text-slate-200">
            {events.length === 0 ? <p className="text-slate-500">No events yet.</p> : events.map((entry, index) => <div key={`${entry.time}-${index}`} className="rounded bg-slate-950/70 p-2 font-mono"><span className="text-slate-400">{entry.time}</span> {entry.message}</div>)}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-[#0a0d14] p-4">
            <h2 className="text-lg font-bold">HLS.js errors</h2>
            <div className="mt-3 max-h-40 space-y-2 overflow-auto pr-1 text-xs text-slate-200">
              {hlsErrors.length === 0 ? <p className="text-slate-500">No HLS.js errors yet.</p> : hlsErrors.map((entry, index) => <div key={`${entry.type ?? "error"}-${index}`} className="rounded bg-slate-950/70 p-2 font-mono">{JSON.stringify(entry)}</div>)}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0a0d14] p-4">
            <h2 className="text-lg font-bold">Media errors</h2>
            <div className="mt-3 max-h-40 space-y-2 overflow-auto pr-1 text-xs text-slate-200">
              {mediaErrors.length === 0 ? <p className="text-slate-500">No media errors yet.</p> : mediaErrors.map((entry, index) => <div key={`${entry}-${index}`} className="rounded bg-slate-950/70 p-2 font-mono">{entry}</div>)}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0a0d14] p-4">
            <h2 className="text-lg font-bold">Network errors</h2>
            <div className="mt-3 max-h-40 space-y-2 overflow-auto pr-1 text-xs text-slate-200">
              {networkErrors.length === 0 ? <p className="text-slate-500">No network errors yet.</p> : networkErrors.map((entry, index) => <div key={`${entry}-${index}`} className="rounded bg-slate-950/70 p-2 font-mono">{entry}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
