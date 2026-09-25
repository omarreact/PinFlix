# CineplexBD live taxonomy integration task

Repository: https://github.com/omarreact/PinFlix

Continue from the current PinFlix 2.0 architecture. Do not redesign the application and do not replace the working HLS/player pipeline.

## Goal

Use the current public CineplexBD navigation at `http://cineplexbd.net/` as the primary source of category truth, while retaining a verified fallback taxonomy for outages. Normalize CineplexBD categories into stable Pinflix IDs and keep exact upstream category values server-side.

## Required behavior

- Inspect the live rendered CineplexBD navigation when running from a network that can reach it.
- Capture visible label, exact href, endpoint, query/category value, group, media type, and pagination capability.
- Treat `category.php` and `tcategory.php` values as upstream data; do not derive them from display labels when the actual href is available.
- Keep duplicate labels distinct by endpoint/group/category value.
- Preserve upstream typos (for example the verified `Hindi Dubbed/Chinees Movies` value) while allowing a friendly Pinflix label.
- Do not expose arbitrary upstream URLs as client-controlled fetch targets.
- Cache navigation discovery and fall back to the verified taxonomy if live discovery is unavailable.
- Integrate movie categories into `/movies`.
- Integrate TV/series categories into `/series`.
- Keep category navigation keyboard/remote/mobile friendly.
- Reuse the existing normalized entertainment cards, detail pages, resolver, playback proxy, and `WatchPlayer`.
- Preserve HLS manifest rewriting, manifest HTTP 200 normalization, segment 206/Range behavior, and SSRF/private-network protections.
- SOFTWARE may be discovered but must not be added as a Pinflix media category.
- TOP WATCH may only be integrated if its live href/content is confirmed to be a browsable media collection.
- Do not aggressively crawl CineplexBD.

## Acceptance checks

From a network that can reach CineplexBD:

1. Open `/api/cineplexbd/taxonomy` and confirm `source: "live"`.
2. Verify the complete live category list and exact upstream values.
3. In `/movies`, test Tamil Movies, Hindi, Korean, 4K Movies, and at least one newly discovered category.
4. In `/series`, test Web Series, Hindi Series, Korean Series, Animation Series, and one show/sports category.
5. Open a dynamically discovered movie, resolve it through the CineplexBD provider, and confirm actual video/audio playback through the existing Pinflix proxy/player.
6. Verify page 2 where CineplexBD reports pagination.
7. Run `npm run typecheck` and `npm run build`.
8. Regression-test Live TV and the existing HLS demo source.

The live CineplexBD DOM is authoritative when available; the fallback list exists only for availability resilience.
