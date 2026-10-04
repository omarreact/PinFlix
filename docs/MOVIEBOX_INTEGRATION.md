# MovieBox integration status

MovieBox is the single active PinFlix content source.

## MovieBox data used by PinFlix

- Home feed: `/wefeed-h5api-bff/home?host=movie-box.co`
  - featured/banner subjects
  - editorial subject rails
  - coming-soon subjects
  - rail identifiers used for browse categories
- Trending/browse: `/wefeed-h5api-bff/subject/trending`
- Rail pagination: `/wefeed-h5api-bff/ranking-list/content`
- Search: `/wefeed-h5api-bff/subject/search`
- Detail: `/wefeed-h5api-bff/detail?detailPath=...`
  - synopsis, year, duration, genres and country
  - IMDb rating/count
  - cast and character names
  - dubs/language variants
  - trailer metadata
  - season/episode structure and available resolutions
- Recommendations: `/wefeed-h5api-bff/subject/detail-rec`
- Playback: `/wefeed-h5api-bff/subject/play`
- Subtitle discovery: `/wefeed-h5api-bff/subject/caption`

MovieBox response data is normalized into the PinFlix `Entertainment` and `StreamSource` models. MovieBox provider IDs preserve `subjectId` and `detailPath` so details, dubs, episodes, recommendations and playback remain connected without a second metadata service.

## PinFlix data path

```text
MovieBox home / trending / search
        ↓
MovieBox subjectId + detailPath
        ↓
PinFlix catalog + detail UI
        ↓
MovieBox detail / recommendations / seasons / captions
        ↓
MovieBox play
        ↓
explicitly unlocked HLS or MP4
        ↓
PinFlix embedded player
```

TMDB and CineplexBD are not part of the active catalog or playback path.

## Playback boundary

PinFlix accepts a MovieBox playback entry only when:

- it has a direct HTTPS URL;
- MovieBox marks it `vipLocked: false`;
- it does not require `signCookie`;
- it does not require `signHeaderKey`;
- it is a directly browser-playable HLS or MP4 source.

PinFlix does not replay VIP authorization headers, inject protected cookies, decode hidden signed-cookie CDN paths, proxy DRM keys/signing secrets, or convert locked DASH responses into unauthorized playback.

Subtitle URLs returned by MovieBox are delivered through a restricted subtitle endpoint that only accepts known HTTPS CDN domains and converts SRT timing syntax to WebVTT when required by the browser player.
