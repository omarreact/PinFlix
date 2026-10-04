# MovieBox integration status

MovieBox is the active PinFlix catalog and playback provider.

## Implemented

- Provider-neutral `PinFlixProvider` contract for catalog, details, series navigation and playback resolution.
- MovieBox web search via `/wefeed-h5api-bff/subject/search`.
- MovieBox trending catalog via `/wefeed-h5api-bff/subject/trending`.
- MovieBox detail lookup via `/wefeed-h5api-bff/detail?detailPath=...`.
- MovieBox playback lookup via `/wefeed-h5api-bff/subject/play`.
- Movie and TV normalization into the PinFlix `Entertainment` model.
- Season/episode navigation from MovieBox detail metadata.
- Direct playback for provider responses explicitly marked unlocked.
- TMDB remains the public metadata/discovery layer and resolves playable MovieBox matches by title/type/year.

## Playback boundary

PinFlix accepts direct MovieBox HLS/MP4 sources only when the provider response explicitly marks them as unlocked.

PinFlix does not:

- replay VIP authorization headers;
- inject protected provider cookies;
- decode hidden signed-cookie CDN paths;
- proxy DRM keys or signing secrets;
- convert locked DASH responses into unauthorized browser playback.

## Production provider

```text
TMDB discovery / PinFlix UI
        ↓
MovieBox catalog search
        ↓
MovieBox subjectId + detailPath
        ↓
MovieBox detail / trending / play
        ↓
explicitly unlocked HLS or MP4
        ↓
PinFlix embedded player
```

CineplexBD and its catalog APIs, proxy routes, Cloudflare relay workers and playback rewrites have been removed.
