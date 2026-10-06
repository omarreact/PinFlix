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
| Catalog / Playback | **Only** `https://movibox.net` via H5 API (`h5-api.aoneroom.com`) |
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

- Worker: `pinflix`
- Domain: `pinflix.pincodeit.com`
- Source of truth: GitHub `main`
- Do **not** add Vercel as a production target

## Media boundary

**movibox.net is the only configured catalog and playback provider.**  
Do not reintroduce CineplexBD, TMDB as catalog source, or third-party embed aggregators unless the project owner explicitly changes this decision.

Use media only where the operator is authorized to access and relay it. Upstream availability, content rights, and regional routing remain the responsibility of the source provider.

## Security notes (from platform blueprint)

- Player uses direct resolved streams; no untrusted top-level-navigation embeds for primary playback
- Image domains for CDN hosts (e.g. aoneroom / hakunaymatata) should remain allowlisted in Next config / proxy
- Video elements stay in client components to avoid hydration mismatches
