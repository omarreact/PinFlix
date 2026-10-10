import { WatchHistory } from "@/src/components/watch-history";
import { Suspense } from "react";
import { EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { BrowseTabs } from "@/src/components/browse-tabs";
import { catalogProvider } from "@/src/lib/providers/catalog";
import type { Entertainment } from "@/src/types/catalog";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { availableGenres, catalogueHref, catalogueRails } from "@/src/lib/catalogue";

export const revalidate = 120;
export const preferredRegion = "sin1";

function uniqueItems(items: Entertainment[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export default async function HomePage() {
  // Render from the two catalog requests shown on this page: no extra home-feed fetch.
  const [movieCatalog, seriesCatalog] = await Promise.all([
    catalogProvider.getLatestPage("movie", 1).catch(() => ({ items: [], page: 1, hasNextPage: false })),
    catalogProvider.getLatestPage("show", 1).catch(() => ({ items: [], page: 1, hasNextPage: false })),
  ]);
  const movies = uniqueItems(movieCatalog.items).slice(0, 12);
  const series = uniqueItems(seriesCatalog.items).slice(0, 12);
  const featured = movies[0] ?? series[0];
  const inventory = uniqueItems([...movieCatalog.items, ...seriesCatalog.items]);
  const genres = availableGenres(inventory);
  const collections = catalogueRails(inventory, 4);

  return (
    <div>
      <HomeHero item={featured} />
      <div className="relative z-20 pf-container mx-auto space-y-10 pb-16 pt-8">
        <Suspense fallback={null}>
          <BrowseTabs active="all" />
        </Suspense>

        <section aria-label="Browse movie and TV categories" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div><p className="pf-eyebrow mb-2">EXPLORE THE CATALOGUE</p><h2 className="text-2xl font-medium tracking-tight text-fg md:text-3xl">Find your kind of story</h2></div>
            <Link href="/catalogue" className="media-focus inline-flex min-h-10 items-center gap-2 rounded-md border border-line px-4 text-xs font-semibold text-fg hover:bg-surface">All categories <ArrowRight size={15}/></Link>
          </div>
          <nav className="hide-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="Featured video genres">
            <Link href={catalogueHref("movie")} className="media-focus shrink-0 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium">Movies</Link>
            <Link href={catalogueHref("show")} className="media-focus shrink-0 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium">TV Shows</Link>
            {genres.map(genre => <Link key={genre.slug} href={catalogueHref("all",genre.slug)} className="media-focus shrink-0 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium hover:border-brand">{genre.label}</Link>)}
          </nav>
        </section>
        <WatchHistory compact />
        {movies.length > 0 && <EntertainmentRail title="Latest movies" items={movies} href={catalogueHref("movie")} />}
        {series.length > 0 && <EntertainmentRail title="TV series" items={series} href={catalogueHref("show")} />}
        {collections.map(collection =>
          <EntertainmentRail key={collection.slug} title={`Explore ${collection.label}`} items={collection.items}
            href={catalogueHref("all",collection.slug)} />
        )}

        {!featured && (
          <div className="glass-panel rounded-lg p-7 text-zinc-400">
            <p className="font-bold text-white">Movie catalog temporarily unavailable</p>
            <p className="mt-2 text-sm leading-6">PinFlix could not load playable provider-backed titles. Try again shortly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
