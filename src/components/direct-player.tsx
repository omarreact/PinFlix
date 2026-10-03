"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Copy, Play, RefreshCw } from "lucide-react";
import type Hls from "hls.js";

type Transport = "local-bridge" | "direct";

type Selection = {
  url: string;
  hls: boolean;
  attempt: number;
  transport: Transport;
};

type BridgeState = "idle" | "checking" | "ready" | "missing";

const LOCAL_BRIDGE_BASE = "http://127.0.0.1:8787";
const buttonClass =
  "tv-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 py-2 text-sm font-semibold disabled:opacity-40";

function parseVideoUrl(value: string) {
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Paste an HTTP or HTTPS video link without login credentials.");
  }
  url.hash = "";
  return url;
}

function isCineplexUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  const port = url.port || (url.protocol === "https:" ? "443" : "80");

  if (hostname === "vod.cineplexbd.net") {
    return ["80", "443", "8081"].includes(port);
  }

  if (hostname === "cineplexbd.net" || hostname === "www.cineplexbd.net") {
    return ["80", "443"].includes(port);
  }

  return false;
}

function toLocalBridgeUrl(url: URL) {
  const bridge = new URL("/proxy", LOCAL_BRIDGE_BASE);
  bridge.searchParams.set("url", url.href);
  return bridge.toString();
}

async function bridgeIsReady(timeoutMs = 1800) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${LOCAL_BRIDGE_BASE}/health`, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return false;
    const body = (await response.json()) as { ok?: boolean; service?: string };
    return body.ok === true && body.service === "pinflix-bridge";
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function DirectPlayer() {
  const [input, setInput] = useState("");
  const [format, setFormat] = useState("auto");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [notice, setNotice] = useState("Paste a video link to get started.");
  const [error, setError] = useState("");
  const [bridgeState, setBridgeState] = useState<BridgeState>("idle");
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
            setError("This browser does not support HLS playback.");
            return;
          }

          hls = new HlsPlayer({
            enableWorker: true,
          });

          hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
            if (disposed || !data.fatal) return;

            setError(
              data.type === HlsPlayer.ErrorTypes.NETWORK_ERROR
                ? selection!.transport === "local-bridge"
                  ? "The PinFlix Bridge could not fetch the playlist or a video segment from this device network. Make sure the Bridge is running, then retry."
                  : "The browser could not load the playlist or one of its segments."
                : "The browser could not decode this stream.",
            );
            hls?.destroy();
          });

          hls.loadSource(selection!.url);
          hls.attachMedia(video);
        } else {
          video.src = selection!.url;
          video.load();
        }
      } catch {
        if (!disposed) {
          setError("The player could not start. Retry the stream.");
        }
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

  async function checkBridge(showReadyNotice = false) {
    setBridgeState("checking");
    const ready = await bridgeIsReady();
    setBridgeState(ready ? "ready" : "missing");

    if (ready && showReadyNotice) {
      setNotice("PinFlix Bridge is running on this device.");
      setError("");
    }

    return ready;
  }

  async function play(event: FormEvent) {
    event.preventDefault();
    setError("");

    const original = currentUrl();
    if (!original) return;

    const hls =
      format === "hls" ||
      (format === "auto" && /\.m3u8$/i.test(original.pathname));

    if (original.protocol === "http:" && isCineplexUrl(original)) {
      setNotice("Connecting to the PinFlix Bridge on this device…");

      const ready = await checkBridge();
      if (!ready) {
        setSelection(null);
        setError(
          "PinFlix Bridge is not reachable on this device. Open the installed PinFlix Bridge once, keep it running, then press Load video again.",
        );
        setNotice("The stream was not sent through Cloudflare. PinFlix is waiting for the local device bridge.");
        return;
      }

      setNotice("Loading through your device network with PinFlix Bridge…");
      setSelection({
        url: toLocalBridgeUrl(original),
        hls,
        transport: "local-bridge",
        attempt: Date.now(),
      });
      return;
    }

    if (window.location.protocol === "https:" && original.protocol === "http:") {
      setSelection(null);
      setError(
        "This HTTP source is not in the PinFlix Bridge allowlist, so the HTTPS page will not load it directly.",
      );
      return;
    }

    setNotice("Loading video… Press play when the controls are ready.");
    setSelection({
      url: original.href,
      hls,
      transport: "direct",
      attempt: Date.now(),
    });
  }

  async function copyLink() {
    const url = currentUrl();
    if (!url) return;

    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url.href);
      setNotice("Original video link copied.");
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      setNotice("The link is selected. Long-press or use your browser’s Copy command.");
    }
  }

  const bridgeLabel =
    bridgeState === "checking"
      ? "Checking Bridge…"
      : bridgeState === "ready"
        ? "Bridge connected"
        : bridgeState === "missing"
          ? "Bridge offline"
          : "Check Bridge";

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand">PinFlix player</p>
        <h1 className="mt-2 text-3xl font-bold">Direct Play</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Cineplex HTTP HLS streams use the local PinFlix Bridge so the request leaves from this device and the video still plays inside pinflix.pincodeit.com.
        </p>
      </div>

      <form onSubmit={(event) => void play(event)} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <label htmlFor="video-url" className="block text-sm font-semibold">
          Video link
        </label>

        <input
          ref={inputRef}
          id="video-url"
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="http://vod.cineplexbd.net:8081/.../index.m3u8"
          className="tv-focus w-full rounded-lg border border-line bg-bg px-3 py-3 text-sm"
        />

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="video-format" className="text-sm text-muted">
            Format
          </label>

          <select
            id="video-format"
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            className="tv-focus min-h-11 rounded-lg border border-line bg-bg px-3 text-sm"
          >
            <option value="auto">Auto detect</option>
            <option value="hls">HLS (.m3u8)</option>
            <option value="native">MP4 / browser video</option>
          </select>

          <button type="submit" className={`${buttonClass} bg-brand text-white`}>
            <Play size={17} />
            Load video
          </button>

          <button
            type="button"
            onClick={() => void checkBridge(true)}
            className={buttonClass}
            disabled={bridgeState === "checking"}
          >
            <RefreshCw size={17} className={bridgeState === "checking" ? "animate-spin" : ""} />
            {bridgeLabel}
          </button>

          <button
            type="button"
            onClick={() => void copyLink()}
            disabled={!input.trim()}
            className={buttonClass}
          >
            <Copy size={17} />
            Copy link
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm leading-6 text-amber-300">
            {error}
          </p>
        )}

        <p role="status" className="text-sm text-muted">
          {notice}
        </p>
      </form>

      <div className="overflow-hidden rounded-2xl border border-line bg-black">
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full"
          aria-label="Direct video player"
          onLoadedMetadata={() =>
            setNotice(
              selection?.transport === "local-bridge"
                ? "Video loaded through this device’s PinFlix Bridge. Press play to watch."
                : "Video loaded. Press play to watch.",
            )
          }
          onPlaying={() => {
            setError("");
            setNotice(
              selection?.transport === "local-bridge"
                ? "Playing inside PinFlix through this device network."
                : "Playing directly in PinFlix.",
            );
          }}
          onError={() => {
            if (selection) {
              setError(
                selection.transport === "local-bridge"
                  ? "Playback failed through the local Bridge. Keep the Bridge running and retry."
                  : "Video playback failed. The source may be unavailable or unsupported by this browser.",
              );
            }
          }}
        />
      </div>

      <p className="text-sm leading-6 text-muted">
        No VLC handoff and no external player is used. The companion Bridge only transports approved Cineplex media from your device network; playback remains in the PinFlix web player.
      </p>
    </section>
  );
}
