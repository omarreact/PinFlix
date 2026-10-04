# MovieBox integration status

PinFlix has been refactored so the current UI consumes a provider-neutral contract.

## Implemented

- Provider-neutral `PinFlixProvider` contract for catalog, details, series navigation and playback resolution.
- Current CineplexBD adapter wrapped behind `catalogProvider`, preserving present production behavior.
- MovieBox server-only client scaffold for the researched endpoints:
  - `/wefeed-mobile-bff/tab-api/all`
  - `/wefeed-mobile-bff/tab-operating`
  - `/wefeed-mobile-bff/subject-api/get`
  - `/wefeed-mobile-bff/subject-api/play-info`
  - `/wefeed-mobile-bff/subject-api/dub-info`
  - `/wefeed-mobile-bff/subject-api/get-ext-captions`
  - `/wefeed-mobile-bff/subject-api/search`
  - `/home/v2/get-list`
  - `/wefeed-mobile-bff/subject-api/filter-items`
- MovieBox credentials are server-only and supplied through environment variables.

## Intentionally not implemented

- No decoding of provider-controlled signed cookies or hidden CDN paths.
- No injection of protected cookies into media segment requests.
- No CORS/anti-hotlink bypass for MovieBox media.
- No activation of MovieBox as the production provider until authorized raw responses verify the catalog fields needed by the existing PinFlix UI and a browser-authorized playback contract is available.

## Data still required for activation

1. One redacted authorized `/subject-api/get` response containing the real title/poster/year/genre field names.
2. One redacted authorized `/subject-api/search` response so result-list normalization can be implemented without guessing.
3. One redacted authorized `/home/v2/get-list` response so home/category rows can be mapped exactly.
4. The provider-supported playback contract that PinFlix is allowed to use in a browser. Protected credentials, DRM keys, signing secrets and bypass techniques are not required.
