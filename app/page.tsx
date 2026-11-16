import Link from "next/link";
import { FRANCHISE_COLLECTIONS } from "@/src/lib/franchise-collections";
import { ArrowUpRight } from "lucide-react";
import * as movieboxWeb from "@/src/lib/providers/moviebox/web";
import { Hero } from "@/src/components/source-ui/hero";
import { Row } from "@/src/components/source-ui/cards";
import { Artwork } from "@/src/components/source-ui/artwork";
import { ContinueWatching } from "@/src/components/source-ui/library";
import {
  availableGenres,
  catalogueRails,
  filterCatalogue,
} from "@/src/lib/catalogue";
import { toTitle, titleHref, type Title } from "@/src/lib/source-ui";
import type { Entertainment } from "@/src/types/catalog";

export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

function unique(items: Entertainment[]) {
  return [
    ...new Map(
      items
        .filter((item) => item.provider === "moviebox" || item.id.startsWith("mb-"))
        .map((item) => [item.id, item]),
    ).values(),
  ];
}

function clean(items: Entertainment[], kind?: "movie" | "show") {
  return filterCatalogue(
    unique(items),
    kind ?? "all",
    null,
  );
}

function itemsFromSections(
  sections: movieboxWeb.MovieBoxHomeSection[],
  pattern: RegExp,
  kind: "movie" | "show",
) {
  return clean(
    sections
      .filter((section) => pattern.test(section.label))
      .flatMap((section) => section.items),
    kind,
  );
}

function titleRows(
  items: Entertainment[],
  limit = 14,
) {
  return clean(items).slice(0, limit).map(toTitle);
}

function isHindiItem(item: Entertainment) {
  const languages = [
    ...(item.languages ?? []),
    ...(item.audioLanguages ?? []),
  ].map((value) => String(value).trim().toLowerCase());
  return (
    /\[hindi(?:\]|\b)/i.test(item.title) ||
    languages.includes("hindi") ||
    languages.includes("hi")
  );
}

function taggedHindiItems(
  sections: movieboxWeb.MovieBoxHomeSection[],
  kind: "movie" | "show",
) {
  return clean(
    sections.flatMap((section) => section.items).filter(isHindiItem),
    kind,
  );
}

async function regionalFallback(
  kind: "movie" | "show",
  country: string,
  sections: movieboxWeb.MovieBoxHomeSection[],
  labelPattern: RegExp,
) {
  const providerSectionItems = itemsFromSections(sections, labelPattern, kind);
  if (providerSectionItems.length) return providerSectionItems;

  const broad = await movieboxWeb.getFilteredPage(kind, 1, {
    sort: "Latest",
    country,
  });
  if (broad.items.length) return clean(broad.items, kind);

  const latest = await movieboxWeb.getLatestPage(kind, 1);
  return clean(latest.items, kind);
}

export default async function Home() {
  const [
    homeSections,
    hollywoodMoviePage,
    hollywoodSeriesPage,
    hindiMoviePage1,
    hindiMoviePage2,
    hindiSeriesPage1,
    hindiSeriesPage2,
  ] = await Promise.all([
    movieboxWeb.getHomeSections().catch(() => []),
    movieboxWeb
      .getFilteredPage("movie", 1, {
        sort: "Latest",
        country: "United States",
      })
      .catch(() => ({ items: [], page: 1, hasNextPage: false })),
    movieboxWeb
      .getFilteredPage("show", 1, {
        sort: "Latest",
        country: "United States",
      })
      .catch(() => ({ items: [], page: 1, hasNextPage: false })),
    movieboxWeb
      .getFilteredPage("movie", 1, {
        sort: "Latest",
        language: "Hindi",
      })
      .catch(() => ({ items: [], page: 1, hasNextPage: false })),
    movieboxWeb
      .getFilteredPage("movie", 2, {
        sort: "Latest",
        language: "Hindi",
      })
      .catch(() => ({ items: [], page: 2, hasNextPage: false })),
    movieboxWeb
      .getFilteredPage("show", 1, {
        sort: "Latest",
        language: "Hindi",
      })
      .catch(() => ({ items: [], page: 1, hasNextPage: false })),
    movieboxWeb
      .getFilteredPage("show", 2, {
        sort: "Latest",
        language: "Hindi",
      })
      .catch(() => ({ items: [], page: 2, hasNextPage: false })),
  ]);

  const hollywoodMovies = hollywoodMoviePage.items.length
    ? clean(hollywoodMoviePage.items, "movie")
    : await regionalFallback(
        "movie",
        "United States",
        homeSections,
        /hollywood|english|western/i,
      );

  const hollywoodSeries = hollywoodSeriesPage.items.length
    ? clean(hollywoodSeriesPage.items, "show")
    : await regionalFallback(
        "show",
        "United States",
        homeSections,
        /hollywood|english|western/i,
      );

  const hindiMovies = clean(
    unique([
      ...hindiMoviePage1.items,
      ...hindiMoviePage2.items,
      ...taggedHindiItems(homeSections, "movie"),
    ]).filter(isHindiItem),
    "movie",
  ).sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  const hindiSeries = clean(
    unique([
      ...hindiSeriesPage1.items,
      ...hindiSeriesPage2.items,
      ...taggedHindiItems(homeSections, "show"),
    ]).filter(isHindiItem),
    "show",
  ).sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  const providerRows = homeSections
    .map((section) => ({
      ...section,
      items: clean(section.items),
    }))
    .filter(
      (section) =>
        section.items.length >= 4 &&
        !/banner|featured|adult|18\+|hentai|porn|erotic/i.test(section.label),
    )
    .slice(0, 12);

  const discoveryPool = unique([
    ...hollywoodMovies,
    ...hollywoodSeries,
    ...hindiMovies,
    ...hindiSeries,
    ...homeSections.flatMap((section) => section.items),
  ]);

  const movies = clean(
    [...hollywoodMovies, ...hindiMovies, ...discoveryPool],
    "movie",
  );
  const series = clean(
    [...hollywoodSeries, ...hindiSeries, ...discoveryPool],
    "show",
  );

  const featured: Title[] = [];
  for (let index = 0; index < 4; index++) {
    if (hollywoodMovies[index]) featured.push(toTitle(hollywoodMovies[index]));
    if (hollywoodSeries[index]) featured.push(toTitle(hollywoodSeries[index]));
    if (hindiMovies[index]) featured.push(toTitle(hindiMovies[index]));
  }

  if (!featured.length) {
    featured.push(...[...movies, ...series].slice(0, 5).map(toTitle));
  }

  const categories = availableGenres(discoveryPool);
  const genreRows = catalogueRails(discoveryPool, 6);

  return (
    <>
      <Hero titles={featured.slice(0, 5)} />

      <div className="page-content">
        <div className="discovery-bar">
          <span>MovieBox discovery</span>
          <div className="chips">
            <Link href="/movies?category=English">Hollywood Movies</Link>
            <Link href="/series">Hollywood TV</Link>
            <Link href="/movies?category=Hindi">Hindi Movies</Link>
            <Link href="/series">Hindi TV</Link>

            {FRANCHISE_COLLECTIONS.slice(0, 4).map((collection) => (
              <Link
                key={collection.slug}
                href={`/catalogue?category=${collection.label}`}
              >
                {collection.label}
              </Link>
            ))}

            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.slug}
                href={`/movies?category=${encodeURIComponent(category.label)}`}
              >
                {category.label}
              </Link>
            ))}

            <Link href="/catalogue">
              All collections <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        <ContinueWatching />

        <Row
          kicker="LATEST FROM MOVIEBOX"
          title="Latest Hollywood Movies"
          items={titleRows(hollywoodMovies)}
          href="/movies?category=English"
        />

        <Row
          kicker="LATEST FROM MOVIEBOX"
          title="Latest Hollywood TV Shows"
          items={titleRows(hollywoodSeries)}
          href="/series"
        />

        <Row
          kicker="BOLLYWOOD & HINDI"
          title="Latest Hindi Movies"
          items={titleRows(hindiMovies)}
          href="/movies?category=Hindi"
        />

        <Row
          kicker="BOLLYWOOD & HINDI"
          title="Latest Hindi TV Shows"
          items={titleRows(hindiSeries)}
          href="/series"
        />

        <section className="editorial">
          <div>
            <p className="eyebrow">ONE EPISODE IS NEVER ENOUGH</p>
            <h2>
              One more
              <br />episode.
            </h2>
            <p>
              Latest MovieBox series, web shows and long-form stories in one
              place.
            </p>
            <Link className="primary" href="/series">
              Browse TV shows <ArrowUpRight size={18} />
            </Link>
          </div>

          <div className="editorial-posters">
            {titleRows(series, 3).map((title) => (
              <Link key={title.id} href={titleHref(title)}>
                <Artwork src={title.poster} alt={title.title} />
              </Link>
            ))}
          </div>
        </section>

        {providerRows.map((section) => (
          <Row
            key={section.id}
            kicker="MOVIEBOX COLLECTION"
            title={section.label}
            items={titleRows(section.items)}
            href="/catalogue"
          />
        ))}

        {genreRows.map((section) => (
          <Row
            key={section.slug}
            kicker="BROWSE BY GENRE"
            title={section.label}
            items={titleRows(section.items)}
            href={`/catalogue?genre=${section.slug}`}
          />
        ))}

        <Row
          kicker="MORE TO DISCOVER"
          title="More Movies on MovieBox"
          items={movies.slice(14, 28).map(toTitle)}
          href="/movies"
        />

        <Row
          kicker="KEEP WATCHING"
          title="More TV Shows on MovieBox"
          items={series.slice(14, 28).map(toTitle)}
          href="/series"
        />
      </div>
    </>
  );
}
