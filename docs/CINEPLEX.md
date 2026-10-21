# CineplexBD universal search integration

Verified on 2026-10-21 from the local development machine. No production deployment was performed.

## Implementation

- Header autocomplete uses CineplexBD JSON only, with 250 ms debounce, cancellation, stale-response guards, loading/errors, and arrow/Enter/Escape keyboard controls.
- Search results, movie and series catalogs preserve the existing PinFlix components, palette, routes, and player.
- Strict TypeScript/Zod validation, safe poster resolution, ID-based deduplication, timeouts, two-attempt maximum retries, a per-process token bucket, bounded TTL cache, and in-flight deduplication.
- New metadata requests use fixed upstream hostnames and validate every redirect through the existing origin transport. Bodies are limited to 3 MB. No user-supplied arbitrary fetch endpoint exists.
- Details and series discovery use the observed public source routes. Seasons, sparse episode numbers, source titles, and individual source links are preserved.
- Existing MP4/WebM native and HLS playback remain in the player. CineplexBD playback is restricted unless the operator sets CINEPLEX_PLAYBACK_AUTHORIZED=true. Media URLs remain hostname-allowlisted. Session cookies are not included in browser-facing stream URLs.

## Verified source endpoints

| Source request | Observed result |
| --- | --- |
| `/search_ajax.php?q=Avatar&limit=8` | 200, application/json, results envelope |
| `/search_ajax.php?q=Inception&limit=8` | 200, three distinct movie editions |
| `/search_ajax.php?q=Breaking%20Bad&limit=8` | 200, movie and series results; series 10306 |
| `/search_ajax.php?q=বাংলা&limit=8` | 200, empty results |
| `/search_ajax.php?q=zzzznoresult998877&limit=8` | 200, empty results |
| `/search.php?q=Avatar` | 200, HTML, 19 parsed catalog entries |
| `/search.php?page=2` | 200, HTML, next/previous pagination links |
| `/view.php?id=40804` | 200, Avatar: The Way of Water details, year 2022 |
| `/tview.php?id=10306` | 404; not used as a working series endpoint |
| `/watch.php?id=10306&season=1` | 200, HTML, five seasons and six source episode links |
| `/watch.php?id=10306&season=1&meta=1` | 200 JSON; includes source-provided episode paths |
| `/category.php?category=Animation` | 200, paginated movie catalog |
| `/tcategory.php?category=English%20Series` | 200, paginated TV catalog |
| `/category.php?category=Animation&year=2022&letter=A` | 200, filtered source movie catalog |
| `/tcategory.php?category=English%20Series&year=2008&letter=B` | 200, Breaking Bad result |

Live taxonomy discovery found 65 categories, including movie, regional/dubbed, anime/animation, documentary, series, WWE and AEW categories. Nothing is synthesized from TMDB search; TMDB image URLs are accepted only when supplied as source artwork.

## PinFlix API

These are application routes, not claims about CineplexBD endpoint names:

- `GET /api/cineplex/search?q=Avatar`
- `GET /api/cineplex/search?q=Avatar&type=movie&year=2022&sort=title`
- `GET /api/cineplex/search?q=Inception&mode=suggest`
- `GET /api/cineplex/movies?page=2`
- `GET /api/cineplex/series?category=English%20Series`
- `GET /api/cineplex/categories`
- `GET /api/cineplex/details?id=40804&type=movie`
- `GET /api/cineplex/details?id=10306&type=series`
- `GET /api/cineplex/seasons?id=10306`
- `GET /api/cineplex/episodes?id=10306&season=1`
- `GET /api/cineplex/health`

Search returns `provider`, `results`, `items` (compatibility alias), `page`, `hasNextPage`, `filtering`, `sorting`, and `suggestions`. A representative normalized item is:

```json
{
  "id": "cb-movie-40804",
  "slug": "cb-movie-40804",
  "provider": "cineplexbd",
  "providerId": "40804",
  "title": "Avatar The Way of Water",
  "kind": "movie",
  "year": 2022,
  "detailUrl": "/view.php?id=40804",
  "category": "Dual Audio",
  "poster": "/api/proxy-image?url=http%3A%2F%2Fcineplexbd.net%2Fuploads%2Ft6HIqrRAclMCA60NsSmeqe9RmNV.jpg"
}
```

Episode responses include real source numbers rather than a generated 1..N sequence. Example entry:

```json
{
  "number": 2,
  "season": 1,
  "title": "Breaking Bad-S1E2-1080P",
  "sourceUrl": "http://cineplexbd.net/watch.php?id=10306&season=1&ep=2&autoplay=1#ep-2",
  "playback": "unverified"
}
```

Errors use `{error, code, provider}` with 400 for input errors, 403 for source restrictions, 404 for missing details, 429 with Retry-After for rate limits, 502 for upstream/schema failures, 503 for network errors, and 504 for timeouts. Existing resolve API reports restricted playback explicitly.

## Filtering and pagination

The source search endpoint supplies partial title matches, including Unicode queries. Exact source titles remain in those results. Category browsing forwards the observed category, year, genre and initial-letter filters. Search-query year/category/type filters and A–Z/Z–A sorting apply to the current upstream result page. The API reports that scope; it does not claim global sorting or exact total counts. Different IDs with identical titles can be different audio/quality editions and are retained.

## Series and playback results

Breaking Bad 10306 exposes seasons 1–5. Season 1 contains source numbers 1, 2, 4, 5, 6 and 7. Episode 3 was not invented. Source metadata contains incorrect-looking cross-title entries, including episode 4; the UI preserves source labels and warns about upstream quality. Empty episode discovery and parser failures are distinguished. Stream authorization, access restrictions and DRM are not bypassed. No CineplexBD stream has been claimed playable. DASH playback was not added; no authorized DASH source was verified. Existing iframe handling remains unchanged.

## Modified files

- `src/lib/cineplex/{client,search,parser,types,normalize,categories,movies,series,episodes,cache,health,routes}.ts`
- `app/api/cineplex/{search,movies,series,categories,details,seasons,episodes,health}/route.ts`
- `src/lib/providers/cineplexbd/{api,index,parser}.ts`
- `src/lib/providers/contracts.ts`
- `src/components/{live-search,watch-client,cineplex-episodes}.tsx`
- `app/{search,movies,series}/page.tsx`
- `app/entertainment/[slug]/page.tsx`
- `app/api/resolve/route.ts`
- `tests/cineplex.test.ts`, `tests/cineplex-live.test.ts`
- `.env.example`, `docs/CINEPLEX.md`

## Validation and limitations

Fixture regression tests cover JSON normalization, URL mapping, Unicode, missing posters, empty results, invalid JSON/schema, HTTP errors, bounded timeouts/retries, caching/deduplication, pagination, seasons, sparse episodes, and unsafe URL/redirect rejection. Live tests are opt-in with `CINEPLEX_LIVE=1 npx vitest run tests/cineplex-live.test.ts`; ordinary tests use labeled synthetic fixtures.

TTL and rate limits are per application process, not distributed across multiple deployment instances. HTTPS and media availability can differ by network; live HTTP catalog requests succeeded here. Browser testing verified rendered search results and live suggestions at the available browser width. Mobile breakpoint/device and end-to-end authorized playback verification still require further validation. This is a reviewed integration candidate, not a claim that every source entry is production-playable.

The downloaded source matches the cPanel development branch `codex/bdix-streaming-completion`, with additional pre-existing local changes. The feature PR targets that branch, not the substantially different `main`. Unrelated local changes and databases are excluded from the feature commit. The existing local `test.cjs` lint error is unrelated to this integration.

Validation result: 43 fixture/regression tests passed, six opt-in live checks passed in a separate run, TypeScript passed, and the production build passed. Changed-file ESLint has zero errors (four existing image-element warnings). Repository-wide lint reports the pre-existing require-style import in untracked test.cjs. A final build and live run are recorded in the local verification logs.
