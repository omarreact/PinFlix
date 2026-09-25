import Link from "next/link";
import { ChannelGrid } from "@/src/components/catalog-sections";
import { channels as demoChannels } from "@/src/lib/iptv/catalog";
import { getLiveProviderChannels, toPublicChannel } from "@/src/lib/providers/live-tv";

type SearchParams = Promise<{
  provider?: string;
  category?: string;
  country?: string;
}>;

function filterHref(filters: { provider?: string; category?: string; country?: string }) {
  const params = new URLSearchParams();
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.category) params.set("category", filters.category);
  if (filters.country) params.set("country", filters.country);
  const query = params.toString();
  return query ? `/browse?${query}` : "/browse";
}

export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const providerChannels = await getLiveProviderChannels().catch(() => []);
  const channels = [
    ...providerChannels.map(toPublicChannel),
    ...(providerChannels.length === 0 ? demoChannels : []),
  ];

  const filtered = channels.filter((channel) => {
    if (params.provider && channel.provider !== params.provider) return false;
    if (params.category && channel.category.toLowerCase() !== params.category.toLowerCase()) return false;
    if (params.country && channel.countryCode.toLowerCase() !== params.country.toLowerCase()) return false;
    return true;
  });

  const categories = [...new Set(channels.map((channel) => channel.category).filter(Boolean))].sort();
  const countries = [...new Map(channels.map((channel) => [channel.countryCode, channel.country])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));

  const providerOptions = [
    { id: "", label: "All Sources" },
    { id: "iptvorg", label: "iptv-org" },
    { id: "roarzone", label: "RoarZone" },
    { id: "mango", label: "Mango" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Live TV</p>
        <h1 className="mt-2 text-3xl font-black">Find something live</h1>
        <p className="mt-2 text-muted">
          Public streams from iptv-org (curated), plus RoarZone and Mango when reachable.
          BDIX/private sources stay local-only and are not proxied through Vercel.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-semibold">Sources</p>
          <div className="hide-scrollbar flex gap-2 overflow-x-auto">
            {providerOptions.map((option) => (
              <Link
                key={option.label}
                href={filterHref({
                  provider: option.id || undefined,
                  category: params.category,
                  country: params.country,
                })}
                className={`tv-focus whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${
                  (params.provider ?? "") === option.id
                    ? "border-brand bg-brand text-black"
                    : "border-line bg-surface text-muted"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Countries</p>
          <div className="hide-scrollbar flex gap-2 overflow-x-auto">
            <Link
              href={filterHref({ provider: params.provider, category: params.category })}
              className={`tv-focus whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${
                !params.country ? "border-brand bg-brand text-black" : "border-line bg-surface text-muted"
              }`}
            >
              All
            </Link>
            {countries.map(([code, country]) => (
              <Link
                key={code}
                href={filterHref({ provider: params.provider, category: params.category, country: code })}
                className={`tv-focus whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${
                  params.country === code ? "border-brand bg-brand text-black" : "border-line bg-surface text-muted"
                }`}
              >
                {country}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Categories</p>
          <div className="hide-scrollbar flex gap-2 overflow-x-auto">
            <Link
              href={filterHref({ provider: params.provider, country: params.country })}
              className={`tv-focus whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${
                !params.category ? "border-brand bg-brand text-black" : "border-line bg-surface text-muted"
              }`}
            >
              All
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={filterHref({ provider: params.provider, country: params.country, category })}
                className={`tv-focus whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${
                  params.category === category ? "border-brand bg-brand text-black" : "border-line bg-surface text-muted"
                }`}
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <ChannelGrid channels={filtered} />
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-6 text-muted">
          No channels are available for these filters right now.
        </div>
      )}

      <p className="text-center text-xs text-subtle">
        Catalog metadata from iptv-org. Streams are public broadcaster URLs — availability varies by region.
      </p>
    </div>
  );
}
