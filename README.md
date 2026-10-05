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

PinFlix uses **CineplexBD as its only active catalog and playback provider**.

```text
PinFlix UI
    ↓
CineplexBD provider adapter
    ↓
catalog/search/title metadata
    ↓
playback resolver
    ↓
HTTPS media gateway where required
    ↓
PinFlix HLS/native player
```

The UI consumes normalized provider-neutral title and stream contracts, but no MovieBox provider is active or included in the production catalog pipeline.

```text
app/                              routes and API handlers
src/components/                   reusable UI and player components
src/lib/providers/contracts.ts    provider-neutral catalog/playback contract
src/lib/providers/catalog.ts      active CineplexBD provider binding
src/lib/providers/cineplexbd/     CineplexBD catalog/playback adapter
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

## Media boundary

CineplexBD is the only configured catalog/playback provider. Do not add MovieBox or additional source providers unless the project owner explicitly changes this decision.

Use media only where the operator is authorized to access and relay it. Upstream availability, content rights and regional routing remain the responsibility of the source provider.
