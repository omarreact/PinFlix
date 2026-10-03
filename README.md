# PinFlix

PinFlix is a Next.js entertainment interface for movies and web series.

## Product scope

- Movies
- Web series
- Search
- Category browsing
- Entertainment details
- In-browser playback
- Responsive mobile, desktop and TV-friendly navigation

The current UI follows a clean light-theme streaming layout with a fixed desktop sidebar, utility header, horizontal content rails and reusable poster cards.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- hls.js
- Cloudflare Workers / vinext deployment tooling

## Project structure

```text
app/                              routes and API handlers
src/components/                   reusable UI and player components
src/lib/providers/cineplexbd/     Cineplex catalog and playback resolution
src/lib/cineplex-playback-proxy.ts guarded Cineplex media proxy
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

## Cleanup policy

PinFlix keeps only product code related to the entertainment experience. Temporary NID tools, Direct Play experiments, Termux bridges and Android local-bridge prototypes have been removed from `main`.

## Media boundary

The application should only use media sources that the operator is authorized to access. Upstream availability, rights and regional routing remain the responsibility of the source provider.
