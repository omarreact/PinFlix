# PinFlix

PinFlix is a Next.js movie and series interface with a cinematic dark UI and a decoupled catalog/playback architecture.

## Product scope

- Discover home
- Movies
- Series
- Search
- Dynamic provider categories
- Title details
- My List stored on the viewer's device
- In-browser HLS/native playback
- Responsive mobile, desktop and TV-friendly controls

## Design system

The current interface is adapted from the supplied LeoStream Pro HTML references:

- near-black base: `#030305`
- surface: `#0f0f13`
- indigo → purple primary gradient
- floating glass navigation
- Outfit typography
- cinematic full-bleed hero
- 2:3 poster cards with hover/focus metadata
- pill filters and search
- full-screen playback presentation
- reduced-motion and keyboard focus support

## Architecture

PinFlix keeps the web application, metadata resolution and media delivery separate:

```text
PinFlix UI
    ↓
catalog/provider adapter
    ↓
title metadata + provider ID
    ↓
playback resolver
    ↓
guarded media delivery / HLS
```

The UI does not need to know where an upstream media file lives. Catalog code returns normalized title information; playback resolution happens only when the viewer starts a title.

```text
app/                              routes and API handlers
src/components/                   reusable UI and player components
src/lib/providers/cineplexbd/     catalog, parser and playback resolver
src/lib/cineplex-playback-proxy.ts guarded Cineplex media proxy
src/lib/saved.ts                  client-side My List persistence
src/types/                        catalog and playback contracts
```

## Development

```bash
npm ci
npm run dev
```

Validation:

```bash
npm run check
```

Cloudflare build:

```bash
npm run build:vinext
```

## Production deployment

PinFlix production is Cloudflare-only.

- Production application: Cloudflare Worker `pinflix`
- Production domain: `pinflix.pincodeit.com`
- Media/catalog edge: Cloudflare Worker `pinflix-media-edge`
- Static assets: Cloudflare Worker `pinflix-assets`
- Source of truth: GitHub `main`
- Vercel is not a deployment target for this application.

Do not add Vercel configuration or Vercel deployment workflows to this repository.

## Repository cleanup

Temporary NID tools, Direct Play experiments, Termux bridges and Android local-bridge prototypes are not part of the PinFlix product and have been removed from `main`.

## Media boundary

Use only media sources that the operator is authorized to access. Upstream availability, content rights and regional routing remain the responsibility of the source provider.
