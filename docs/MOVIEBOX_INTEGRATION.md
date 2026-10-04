# MovieBox integration status

MovieBox is the single user-facing PinFlix catalog, metadata and playback provider.

## Catalog and discovery

PinFlix uses the current MovieBox web surfaces for:

- homepage/editorial rails;
- movie catalog;
- series catalog;
- dynamic public collections/ranking lists;
- search;
- title detail pages;
- content type, year, rating, genres, synopsis and artwork;
- public country, duration, language/dub/sub labels and cast metadata when exposed;
- public taxonomy including content types, genres, countries, years, language variants and sort modes;
- series season/episode navigation when returned by MovieBox detail metadata.

The public catalog fallback reads first-party `movie-box.co` pages and normalizes them into PinFlix IDs. Structured MovieBox web endpoints remain preferred when they return usable data.

## Playback

Playback lookup uses the MovieBox web playback response. PinFlix accepts only direct media sources that are explicitly returned as unlocked.

PinFlix does not:

- replay VIP authorization headers;
- inject protected provider cookies;
- decode hidden signed-cookie CDN paths;
- proxy DRM keys or signing secrets;
- convert locked DASH responses into unauthorized browser playback.

## PinFlix flow

```text
MovieBox home / movie / series / collections
                    ↓
             PinFlix catalog
                    ↓
MovieBox search + title/detail metadata
                    ↓
       MovieBox season navigation
                    ↓
          MovieBox playback lookup
                    ↓
 explicitly unlocked HLS / MP4 only
                    ↓
          PinFlix embedded player
```

CineplexBD and TMDB are not part of the current user-facing catalog pipeline.
