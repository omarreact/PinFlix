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


## Cloudflare catalog connectivity

The application can keep its public CineplexBD URL semantics while routing server-side catalog and metadata requests through an authorized network relay when the upstream is not reachable directly from Cloudflare.

Set this only when you operate or are authorized to use the relay:

```bash
CINEPLEX_CATALOG_RELAY_URL=https://your-authorized-relay.example
```

The relay is expected to preserve the CineplexBD request path and query string. For example, a request for `/search.php?q=...` is sent to the same path on the configured relay. Media URLs are not rewritten to the relay by this setting.

When the variable is absent or invalid, PinFlix uses the normal direct CineplexBD catalog path. The health endpoint reports the active transport as `direct` or `relay`.
