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

## Architecture

PinFlix uses **movibox.net (MovieBox) as its only active catalog and playback provider**.

```text
PinFlix UI
    ↓
MovieBox (movibox.net) provider adapter
    ↓
catalog/search/title metadata + home sections
    ↓
playback resolver (MP4 streams + captions)
    ↓
PinFlix native / HLS player
```

The UI consumes normalized provider-neutral title and stream contracts. All catalog and stream resolution is performed exclusively through the verified movibox.net / H5 API surfaces (`https://movibox.net` + `https://h5-api.aoneroom.com`).

```text
app/                              routes and API handlers
src/components/                   reusable UI and player components
src/lib/providers/contracts.ts    provider-neutral catalog/playback contract
src/lib/providers/catalog.ts      active MovieBox (movibox.net) provider binding
src/lib/providers/moviebox/       MovieBox web/H5 API adapter
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
- Static assets: Cloudflare Workers Static Assets, deployed atomically with `pinflix`
- Source of truth: GitHub `main`
- Vercel is not a deployment target for this application.

Do not add Vercel configuration or Vercel deployment workflows to this repository.

Static CSS/JS assets are deployed directly with the main Worker through Wrangler's native `assets.directory` configuration. Production must not depend on GitHub Raw or jsDelivr for runtime application assets.

## Media boundary

movibox.net (MovieBox H5 API) is the only configured catalog/playback provider. Do not add CineplexBD, TMDB, or additional source providers unless the project owner explicitly changes this decision.

Use media only where the operator is authorized to access and relay it. Upstream availability, content rights and regional routing remain the responsibility of the source provider.
