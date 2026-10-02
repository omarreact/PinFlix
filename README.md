# PinFlix

PinFlix is a Next.js streaming interface focused on CineplexBD movies and web series.

## Current product scope

- Fresh CineplexBD movie catalog
- Fresh CineplexBD web-series catalog
- Dynamic category discovery with verified fallbacks
- Search across CineplexBD entertainment
- Movie playback
- Web-series season and episode selection
- Same-origin HTTPS HLS delivery with a guarded Cineplex-only proxy fallback
- Responsive web and TV-style player controls

The application now has a single entertainment catalog and playback architecture centered on CineplexBD.

## Setup

```bash
npm ci
npm run dev
```

Validation:

```bash
npm run check
```

## Architecture

```text
app/                              pages and same-origin API handlers
src/components/                   entertainment UI and player
src/lib/providers/cineplexbd/     Cineplex catalog, parsing and playback resolution
src/lib/cineplex-playback-proxy.ts guarded HLS/media fallback proxy
src/types/                        entertainment and playback contracts
```

The browser receives same-origin HTTPS media URLs whenever the CineplexBD source is HTTP-only. HLS manifests and child segments can fall back through the guarded proxy, which only accepts the approved CineplexBD hosts and ports.

## Legal and operational boundaries

Use PinFlix only with media sources you are authorized to access. Upstream availability, regional routing, and content rights remain the responsibility of the source provider.
