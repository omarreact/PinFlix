# PinFlix

A Next.js streaming app with a cinematic catalog, MP4/HLS playback, subtitles, source switching, episode navigation, My List, resume playback, local watch history, and administrator delisting.

This implementation follows the shared [BDIX architecture document](https://share.gemini.google/8ueeumWBRThJ). The existing MovieBox adapter remains available for compatibility; production directory ingestion targets `http://cds3.cineplexbd.net/index.php`.

## Run locally

Requires Node 24.

```bash
cp .env.example .env
npm ci
npm run db:setup
npm run seed
npm run dev
```

Open http://localhost:3000. The seeded catalog plays public demo/test MP4 and HLS streams without API keys. Fictional movie and episode entries are clearly demo fixtures and share the test media. Demo credentials:

- Viewer: `viewer@example.com` / `Viewer123!`
- Administrator: `admin@example.com` / `Admin123!`

Seeding resets the local database. Never seed a database containing real accounts or imported content. Demo accounts must not be used in production.

```bash
npm run check
```

The test suite covers directory parsing, filename sanitization, origin boundaries, redirects, byte ranges, HEAD/416 responses, HLS manifest rewriting, and subtitle conversion.

## Catalog and ingestion

The default catalog reads published titles from SQLite. It includes seeded demo titles in development and imported titles after ingestion. `CATALOG_PROVIDER=cineplexbd` selects the existing CineplexBD website adapter; `moviebox` selects the legacy adapter. IDs from all adapters are resolved server-side. The browser never imports catalog clients or Prisma.

Run on a server that can reach the BDIX origin:

```bash
npm run ingest
```

The bounded, sequential crawler visits same-origin directory links, deduplicates sources, extracts movie/season/episode names, and stores titles, episodes, sources and subtitle sidecars in Prisma. Optional TMDB credentials enrich exact title/year matches with artwork and descriptions. It supports MP4, WebM and HLS; MKV requires a separate transcoding service and is deliberately excluded from browser playback.

`CINEPLEX_DIRECTORY_URL` controls the starting directory on `cds3.cineplexbd.net`; `INGEST_MAX_PAGES` bounds each scan (default 100, maximum 1000). Schedule regular scans using cron, for example:

```cron
0 */6 * * * cd /srv/pinflix && /usr/bin/npm run ingest >> /var/log/pinflix-ingest.log 2>&1
```

Only ingest media you are authorized to distribute. In `/admin`, delist a title to immediately disable catalog details and stream resolution. An archived title stays archived on subsequent ingestion runs. Publication changes are recorded in an audit log. The administrator page requires a current, active administrator account.

## Playback

Cineplex HTTP media is relayed through same-origin HTTPS routes. The proxy streams the response body without buffering a movie in memory, forwards range metadata, rewrites HLS segment/key/map URLs, converts SRT to WebVTT, validates redirect destinations, and cancels requests when clients disconnect. Its connection timeout ends after response headers arrive, so long videos are not interrupted by a fixed request-duration limit.

Keyboard controls: Space/K play/pause, arrows seek or change volume, M mute, F fullscreen. Source changes preserve playback position. My List and history are browser-local and are not synchronized across devices or viewing profiles.

## cPanel hosting

See [the cPanel setup guide](deploy/CPANEL.md) and use `server.cjs` as the Passenger startup file if your plan supports Node.js. PHP-only hosting cannot run the application backend.

## BDIX VPS deployment

The architecture requires a server with actual access to the media origin. A Vercel project or a Cloudflare edge deployment does not establish BDIX connectivity. Existing Cloudflare/Vercel files are retained for reference; this deployment uses Node on a VPS and persistent SQLite.

1. Copy `.env.example` to `.env`; configure a unique random `AUTH_SECRET`, application URL and production catalog settings.
2. Initialize persistent storage: `docker compose --profile tools run --rm setup`.
3. Create an administrator using `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters), then run `npm run admin:setup` in the build/tools image against the persistent database. Remove the bootstrap password afterwards.
4. Run `docker compose --profile tools run --rm ingest` from the BDIX-connected host. Repeat via cron for automatic refresh.
5. Start `docker compose up -d app nginx`.
6. Install and verify a TLS certificate for `pinflix.pincodeit.com` before public use. The included Nginx file is an HTTP bootstrap configuration, not a complete certificate installation. Media buffering is disabled.

Docker execution and TLS/domain changes must be verified on the target host. The default database URL in the container is `file:/app/data/pinflix.db`, stored in the `pinflix-data` volume. The `/api/health` endpoint reports database readiness and published title count; `/api/cineplexbd/status` provides the website adapter connectivity probe.

## Verification and limits

Local browser verification confirmed HLS playback with increasing `currentTime`, seeking and reload resume, working history, administrator login, and a mobile layout without horizontal overflow. Unit tests also verify range relaying and HLS/subtitle rewriting.

The CineplexBD directory and website both timed out from the development environment. Live directory formats, upstream playback, latency, concurrent stream capacity, Docker execution and TLS deployment require validation on the BDIX host. No production domain was changed. This implementation uses the existing custom player rather than Artplayer. It does not provide transcoding, DRM, subtitle synchronization offsets, synchronized profiles, or subscription checkout.
