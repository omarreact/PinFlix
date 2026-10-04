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

The UI and API routes consume a provider-neutral contract with MovieBox as the active catalog and playback provider. PinFlix uses the verified MovieBox web search/detail/trending flow and only exposes playback sources that MovieBox explicitly returns as unlocked direct HLS/MP4 media. Protected/VIP-locked DASH authorization material is not replayed or proxied.

```text
app/                              routes and API handlers
src/components/                   reusable UI and player components
src/lib/providers/contracts.ts    provider-neutral catalog/playback contract
src/lib/providers/catalog.ts      active MovieBox provider adapter used by the UI
src/lib/providers/moviebox/       MovieBox web/provider integration
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
- Static assets: Cloudflare Worker `pinflix-assets`
- Source of truth: GitHub `main`
- Vercel is not a deployment target for this application.

Do not add Vercel configuration or Vercel deployment workflows to this repository.

## Repository cleanup

Temporary NID tools, Direct Play experiments, Termux bridges and Android local-bridge prototypes are not part of the PinFlix product and have been removed from `main`.

## Media boundary

CineplexBD has been removed from PinFlix. MovieBox is the only playback provider behind the catalog adapter. PinFlix accepts only direct sources that the provider marks as unlocked; it does not replay protected provider cookies, VIP authorization headers, DRM keys or signing secrets.

Use only media sources that the operator is authorized to access. Upstream availability, content rights and regional routing remain the responsibility of the source provider.
