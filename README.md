# PinFlix

PinFlix is a dark, keyboard-friendly streaming UI for curated live channels and entertainment catalogs. It uses Next.js App Router, TypeScript, Tailwind CSS v4, Zustand, and same-origin server routes for stream resolution.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Validation:

```bash
npm run typecheck
npm run lint
npm run build
```

## Architecture

```text
app/                 routes, pages, and same-origin API handlers
src/components/      accessible UI, cards, app shell, player
src/lib/iptv/        public catalog, server-only sources, proxy safety, health
src/types/           domain contracts shared across server and UI
```

Public channel data uses `ChannelPreview`. Upstream stream URLs live only in the server-side source resolver. The browser receives same-origin `/api/proxy` URLs, never upstream URLs.

The player supports native media playback and HLS through `hls.js`, with keyboard shortcuts: Space/K play-pause, Left/Right seek, M mute, and F fullscreen. Focusable controls use `.tv-focus`, strong `:focus-visible` rings, scaling, and scroll margins for 10-foot navigation.

## Legal and operational boundaries

PinFlix is a playback shell for streams and metadata that you are authorized to use. Do not add copyrighted or geo-restricted sources without permission. The proxy is catalog-restricted, HTTPS-only, blocks private/internal addresses, and exposes aggregate health diagnostics without user identifiers.
