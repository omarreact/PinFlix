import { Suspense } from "react";
import { EntertainmentRail } from "@/src/components/catalog-sections";
import { HomeHero } from "@/src/components/home-hero";
import { BrowseTabs } from "@/src/components/browse-tabs";
import { catalogProvider } from "@/src/lib/providers/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const feed = await catalogProvider.getHomeFeed();

  return (
    <div>
      <HomeHero item={feed.featured} />

      <div className="relative z-20 mx-auto -mt-8 max-w-[1400px] space-y-12 px-6 pb-24 md:-mt-14 md:px-12">
        <Suspense fallback={null}>
          <BrowseTabs active="all" />
        </Suspense>

        {feed.sections.map((section) => {
          const basePath =
            section.kind === "show"
              ? "/series"
              : section.kind === "movie"
                ? "/movies"
                : undefined;
          const href =
            basePath && section.supportsPagination
              ? `${basePath}?category=${encodeURIComponent(section.id)}`
              : basePath;

          return (
            <EntertainmentRail
              key={section.id}
              title={section.label}
              items={section.items}
              href={href}
            />
          );
        })}

        {feed.sections.length === 0 && (
          <div className="glass-panel rounded-2xl p-7 text-zinc-400">
            <p className="font-bold text-white">MovieBox catalog temporarily unavailable</p>
            <p className="mt-2 max-w-2xl text-sm leading-6">
              PinFlix could not refresh MovieBox right now. Try again shortly. Status:{" "}
              <a className="text-accent underline-offset-2 hover:underline" href="/api/health">
                /api/health
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
