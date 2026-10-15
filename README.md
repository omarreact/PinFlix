# PinFlix — Complete OTT Streaming Platform

PinFlix is a production-oriented Next.js OTT (over-the-top) streaming application with a cinematic dark UI, decoupled catalog/playback architecture, and **movibox.net as the sole catalog and stream provider**.

## Product scope

- Discover home with editorial rails and cinematic hero
- Movies & Series catalog pages
- Search
- Title detail pages
- Full-screen cinema player (native MP4 + HLS.js, quality & subtitle controls, resume, failover)
- My List (client-side persistence)
- Auth (login / register) and health APIs
- Cloudflare Worker deployment with static assets
- Responsive mobile, desktop, and TV-friendly controls

## Four-layer architecture (adapted from the MoviBox-inspired blueprint)

```text
┌─────────────────────────────────────┐
│     End User (Web / PWA)            │
└──────────────────┬──────────────────┘
                   │ HTTPS
┌──────────────────┴──────────────────┐
│  Presentation (Next.js App Router)  │
│  Server Components + Client Player  │
└──────────────────┬──────────────────┘
                   │
┌──────────────────┴──────────────────┐
│  Edge / API routes                  │
│  /api/resolve · /api/search · proxy │
└──────────────────┬──────────────────┘
                   │
┌──────────────────┴──────────────────┐
│  Provider adapter (movibox.net only)│
│  H5 API: home · filter · detail ·   │
│  play · captions                    │
└──────────────────┬──────────────────┘
                   │
┌──────────────────┴──────────────────┐
│  Media delivery                     │
│  Direct MP4 / HLS + optional proxy  │
└─────────────────────────────────────┘
```

### Core technology

| Layer | Choice |
|-------|--------|
| Frontend | Next.js App Router, React Server Components |
| Styling | Tailwind CSS v4 — theater-dark abyss + crimson accent |
| Discovery metadata | TMDB when configured; MovieBox H5 API is the catalog fallback |
| Playback | **Only** `https://movibox.net` via H5 API (`h5-api.aoneroom.com`) |
| Player | Native `<video>` + hls.js, quality switching, captions, resume |
| Deploy | Cloudflare Workers + static assets (`pinflix.pincodeit.com`) |
| Auth / DB | Prisma + optional local/SQLite user state |

### Design system (MoviBox cinematic)

- Background abyss: `#0a0000`
- Surface: `#130303` / card `#1c0606`
- Accent crimson: `#e63946` → hover `#ff4757`
- Radial ambient glow on body
- Glass navigation, poster hover lift, hero vignettes
- Typography: Outfit

## Repository layout

```text
app/                         routes (home, movies, series, watch, search, auth)
src/components/              UI, hero, rails, player, shell
src/lib/providers/
  contracts.ts               provider-neutral catalog/playback contract
  catalog.ts                 binds exclusively to moviebox/web
  moviebox/web.ts            movibox.net H5 adapter
src/styles.css               design tokens + cinematic utilities
src/types/                   Entertainment / StreamSource types
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

## Production

- Vercel project: `omarreacts-projects/pinflix`, Functions region: Singapore (`sin1`)
- Domain: `pinflix.pincodeit.com`
- Source of truth: GitHub `main`
- Cloudflare Worker/R2 remains a separate media-delivery integration; the vinext
  commands above are the alternative Cloudflare application build.

## Provider search

Title search first establishes the provider's normal anonymous session through
its homepage endpoint. The issued `x-user` token stays in server memory for up
to five minutes and is attached to search requests as a bearer token. Concurrent
searches share the handshake; rejected tokens are invalidated and refreshed once
per upstream query. Bootstrap, index queries and retries fit within an eight-second
search budget. No user cookie, committed token or TMDB result is used as a
playable provider title.

Movie/TV filters exclude other provider subject types. Search ranking drops
unrelated recommendations, and pagination follows the provider's `hasMore`
flag rather than the number of visible results. A successful zero-match response
is distinct from an upstream outage; search APIs return a non-cacheable 503 for
the latter. Year-only browsing remains a bounded catalogue window, as explained
on the search page.

`vitest.config.ts` isolates unit tests from the Cloudflare/vinext dev plugins so
running tests does not overwrite Next.js's generated route types before a build.

## Media boundary

Series playback uses `/api/ui/episodes?id=<provider-id>&season=<number>` to
load seasons and episodes from the MovieBox `/wefeed-h5api-bff/detail` endpoint.
Selecting an episode passes its season and episode numbers to `/api/resolve`,
which requests MovieBox `/wefeed-h5api-bff/subject/play` with `subjectId`, `se`,
`ep`, and `detailPath`, alongside the PinFlix CDN resolver. The player supports
MP4 and HLS sources, source failover, and advancing to the next available episode.
Episode-list failures return an error instead of a fabricated one-episode season.

The media resolver uses `PINFLIX_MEDIA_API_URL` (the existing PinFlix media API
by default) and its `/public-resolve?key=...` endpoint. TV keys include the
selected episode: `tv:<MovieBox subject ID>:s<season>e<episode>`.
The response contract is `{ "sources": [{ "url": "https://...", "label": "1080p", "protocol": "hls" }] }`;
`protocol` may be `hls` or `native` and otherwise is inferred from the URL.

If this API returns signed playback URLs on a separate CDN, set the server-only
`PINFLIX_MEDIA_CDN_ORIGINS` to its exact HTTPS origins, separated by commas
(for example `https://video.example.com,https://backup.example.com`). The API's
own origin is also allowed. Signed URLs are preserved and played directly;
the CDN must support browser CORS, including HLS manifests and segments, and
byte-range requests for MP4 playback. One resolver failing does not discard
sources returned by the other resolver.

**movibox.net is the only configured playback provider.** TMDB credentials are optional; when unavailable, discovery and search fall back to the MovieBox catalog so titles remain browseable and playable.
Do not reintroduce CineplexBD or third-party embed aggregators unless the project owner explicitly changes this decision.

Use media only where the operator is authorized to access and relay it. Upstream availability, content rights, and regional routing remain the responsibility of the source provider.

## Security notes (from platform blueprint)

- Player uses direct resolved streams; no untrusted top-level-navigation embeds for primary playback
- Image domains for CDN hosts (e.g. aoneroom / hakunaymatata) should remain allowlisted in Next config / proxy
- Video elements stay in client components to avoid hydration mismatches
