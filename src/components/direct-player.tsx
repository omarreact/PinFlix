"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Copy, ExternalLink, Play } from "lucide-react";
import type Hls from "hls.js";

type Selection = { url: string; hls: boolean; attempt: number };
const buttonClass = "tv-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 py-2 text-sm font-semibold disabled:opacity-40";

function parseVideoUrl(value: string) {
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Paste an HTTP or HTTPS video link without login credentials.");
  }
  url.hash = "";
  return url;
}

export function DirectPlayer() {
  const [input, setInput] = useState("");
  const [format, setFormat] = useState("auto");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [notice, setNotice] = useState("Paste a video link to get started.");
  const [error, setError] = useState("");
  const [httpPage, setHttpPage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selection) return;
    let disposed = false;
    let hls: Hls | undefined;

    async function load() {
      if (!video) return;
      try {
        if (selection!.hls && !video.canPlayType("application/vnd.apple.mpegurl")) {
          const { default: HlsPlayer } = await import("hls.js");
          if (disposed) return;
          if (!HlsPlayer.isSupported()) {
            setError("This browser does not support HLS playback. Open the link in VLC.");
            return;
          }
          hls = new HlsPlayer({ enableWorker: true });
          hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
            if (disposed || !data.fatal) return;
            setError(data.type === HlsPlayer.ErrorTypes.NETWORK_ERROR
              ? "The playlist or video segments could not load. The source may restrict this network or browser access (CORS). Try VLC on this device."
              : "The browser could not decode this stream. Try opening it in VLC.");
            hls?.destroy();
          });
          hls.loadSource(selection!.url);
          hls.attachMedia(video);
        } else {
          video.src = selection!.url;
          video.load();
        }
      } catch {
        if (!disposed) setError("The player could not start. Retry or open the link in VLC.");
      }
    }

    void load();
    return () => {
      disposed = true;
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [selection]);

  function currentUrl() {
    try {
      return parseVideoUrl(input);
    } catch {
      setError("Paste a valid HTTP or HTTPS video link without login credentials.");
      inputRef.current?.focus();
      return null;
    }
  }

  function play(event: FormEvent) {
    event.preventDefault();
    setError("");
    setHttpPage("");
    const url = currentUrl();
    if (!url) return;
    if (window.location.protocol === "https:" && url.protocol === "http:") {
      setSelection(null);
      setHttpPage(`http://${window.location.host}/play`);
      setError("This HTTP video cannot load reliably on an HTTPS page. Copy the video link, open the HTTP player below, and paste it again — or use VLC.");
      return;
    }
    setNotice("Loading video… Press play when the controls are ready.");
    setSelection({ url: url.href, hls: format === "hls" || (format === "auto" && /\.m3u8$/i.test(url.pathname)), attempt: Date.now() });
  }

  function openVlc() {
    const url = currentUrl();
    if (!url) return;
    setNotice("Opening VLC. If it does not open, copy the link and paste it into VLC’s Network Stream option.");
    if (/Android/i.test(navigator.userAgent)) {
      window.location.href = `intent://${url.href.split("://")[1]}#Intent;scheme=${url.protocol.slice(0, -1)};package=org.videolan.vlc;type=video/*;end`;
    } else if (/iPad|iPhone|iPod/i.test(navigator.userAgent)) {
      window.location.href = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(url.href)}`;
    } else {
      window.location.href = `vlc://${url.href}`;
    }
  }

  async function copyLink() {
    const url = currentUrl();
    if (!url) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url.href);
      setNotice("Link copied. In VLC, open Network Stream and paste it.");
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      setNotice("The link is selected. Long-press or use your browser’s Copy command, then paste it into VLC’s Network Stream option.");
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand">PinFlix player</p>
        <h1 className="mt-2 text-3xl font-bold">Direct Play</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Paste an HLS (.m3u8) or MP4 video link. Playback uses your device’s network, so use the same Wi-Fi or mobile connection that works in VLC.</p>
      </div>
      <form onSubmit={play} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <label htmlFor="video-url" className="block text-sm font-semibold">Video link</label>
        <input ref={inputRef} id="video-url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" value={input} onChange={(event) => setInput(event.target.value)} placeholder="http://example.com/video/index.m3u8" className="tv-focus w-full rounded-lg border border-line bg-bg px-3 py-3 text-sm" />
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="video-format" className="text-sm text-muted">Format</label>
          <select id="video-format" value={format} onChange={(event) => setFormat(event.target.value)} className="tv-focus min-h-11 rounded-lg border border-line bg-bg px-3 text-sm">
            <option value="auto">Auto detect</option>
            <option value="hls">HLS (.m3u8)</option>
            <option value="native">MP4 / browser video</option>
          </select>
          <button type="submit" className={`${buttonClass} bg-brand text-white`}><Play size={17} />Load video</button>
          <button type="button" onClick={openVlc} disabled={!input.trim()} className={buttonClass}><ExternalLink size={17} />Open in VLC</button>
          <button type="button" onClick={() => void copyLink()} disabled={!input.trim()} className={buttonClass}><Copy size={17} />Copy link</button>
        </div>
        {error && <p role="alert" className="text-sm leading-6 text-amber-300">{error}</p>}
        {httpPage && <a href={httpPage} className={`${buttonClass} text-brand`}>Open HTTP player<ExternalLink size={16} /></a>}
        <p role="status" className="text-sm text-muted">{notice}</p>
      </form>
      <div className="overflow-hidden rounded-2xl border border-line bg-black">
        <video ref={videoRef} controls playsInline preload="metadata" className="aspect-video w-full" aria-label="Direct video player" onLoadedMetadata={() => setNotice("Video loaded. Press play to watch.")} onPlaying={() => { setError(""); setNotice("Playing directly on your device."); }} onError={() => { if (selection) setError("Video playback failed. The source may be unavailable, restricted, or unsupported by this browser. Try VLC on the same network."); }} />
      </div>
      <p className="text-sm leading-6 text-muted">VLC must be installed to open it. A link working in VLC may still fail in a browser because the source does not allow browser requests or uses an unsupported codec.</p>
    </section>
  );
}
