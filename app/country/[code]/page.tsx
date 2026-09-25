import { notFound } from "next/navigation";
import { BackLink, ChannelGrid } from "@/src/components/catalog-sections";
import { channels } from "@/src/lib/iptv/catalog";

export default async function CountryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const matches = channels.filter((channel) => channel.countryCode === code.toLowerCase());
  if (!matches.length) notFound();
  return <div className="space-y-7"><BackLink href="/browse">Live TV</BackLink><div><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Country</p><h1 className="mt-2 text-3xl font-black">{matches[0].country}</h1></div><ChannelGrid channels={matches} /></div>;
}
