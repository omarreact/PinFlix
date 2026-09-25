import { ChannelGrid } from "@/src/components/catalog-sections";
import { Chip } from "@/src/components/ui/chip";
import { categories, channels, countries } from "@/src/lib/iptv/catalog";

export default function BrowsePage() {
  return <div className="space-y-8"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Live TV</p><h1 className="mt-2 text-3xl font-black">Find something live</h1><p className="mt-2 text-muted">Browse channels by country or category.</p></div><div className="space-y-3"><p className="text-sm font-semibold">Countries</p><div className="hide-scrollbar flex gap-2 overflow-x-auto">{countries.map((country) => <Chip key={country} label={country} href={`/country/${channels.find((channel) => channel.country === country)?.countryCode}`} />)}</div><p className="pt-2 text-sm font-semibold">Categories</p><div className="hide-scrollbar flex gap-2 overflow-x-auto">{categories.map((category) => <Chip key={category} label={category} href={`/category/${encodeURIComponent(category.toLowerCase())}`} />)}</div></div><ChannelGrid channels={channels} /></div>;
}
