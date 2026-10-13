import Link from "next/link";
import { FRANCHISE_COLLECTIONS } from "@/src/lib/franchise-collections";
import { ArrowUpRight } from "lucide-react";
import { catalogProvider } from "@/src/lib/providers/catalog";
import { Hero } from "@/src/components/source-ui/hero";
import { Row } from "@/src/components/source-ui/cards";
import { Artwork } from "@/src/components/source-ui/artwork";
import { ContinueWatching } from "@/src/components/source-ui/library";
import { availableGenres, filterCatalogue } from "@/src/lib/catalogue";
import { toTitle, titleHref, type Title } from "@/src/lib/source-ui";
export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";
export default async function Home() {
  const [moviePage, seriesPage] = await Promise.all([
    catalogProvider.getLatestPage("movie", 1).catch(() => ({ items: [] })),
    catalogProvider.getLatestPage("show", 1).catch(() => ({ items: [] })),
  ]);
  const movies = filterCatalogue(moviePage.items, "movie", null).map(toTitle);
  const series = filterCatalogue(seriesPage.items, "show", null).map(toTitle);
  const featured: Title[] = [];
  for (let index = 0; index < 3; index++) {
    if (movies[index]) featured.push(movies[index]);
    if (series[index]) featured.push(series[index]);
  }
  const categories = availableGenres([...moviePage.items, ...seriesPage.items]);
  return (
    <>
      <Hero titles={featured.slice(0, 5)} />
      <div className="page-content">
        <div className="discovery-bar">
          <span>Find your kind of story</span>
          <div className="chips">
            {FRANCHISE_COLLECTIONS.map((collection) => (
              <Link
                key={collection.slug}
                href={`/catalogue?category=${collection.label}`}
              >
                {collection.label}
              </Link>
            ))}
            {categories.slice(0, 8).map((category) => (
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
          kicker="FRESH ON THE SHELF"
          title="New stories, new obsessions"
          items={movies.slice(0, 12)}
          href="/movies"
        />
        <section className="editorial">
          <div>
            <p className="eyebrow">ONE EPISODE IS NEVER ENOUGH</p>
            <h2>
              Make room for
              <br />a longer story.
            </h2>
            <p>Explore series, discover seasons and keep your place.</p>
            <Link className="primary" href="/series">
              Find a series <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="editorial-posters">
            {series.slice(0, 3).map((title) => (
              <Link key={title.id} href={titleHref(title)}>
                <Artwork src={title.poster} alt={title.title} />
              </Link>
            ))}
          </div>
        </section>
        <Row
          kicker="THE NEXT CHAPTER"
          title="Series to settle into"
          items={series.slice(0, 12)}
          href="/series"
        />
        <Row
          kicker="MORE TO DISCOVER"
          title="Go beyond the familiar"
          items={movies.slice(12, 24)}
          href="/movies"
        />
      </div>
    </>
  );
}
