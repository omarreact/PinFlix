import { notFound } from "next/navigation";
import { BackLink, ChannelGrid } from "@/src/components/catalog-sections";
import { channels } from "@/src/lib/iptv/catalog";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matches = channels.filter((channel) => channel.category.toLowerCase() === decodeURIComponent(id).toLowerCase());
  if (!matches.length) notFound();
  return <div className="space-y-7"><BackLink href="/browse">Live TV</BackLink><div><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Category</p><h1 className="mt-2 text-3xl font-black">{matches[0].category}</h1></div><ChannelGrid channels={matches} /></div>;
}
