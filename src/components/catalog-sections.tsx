import Link from "next/link";
import { ChannelCard } from "@/src/components/channel-card";
import { EntertainmentCard } from "@/src/components/entertainment/card";
import { SectionHeader } from "@/src/components/ui/section-header";
import type { ChannelPreview, Entertainment } from "@/src/types/catalog";

export function ChannelGrid({ channels }: { channels: ChannelPreview[] }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{channels.map((channel) => <ChannelCard key={channel.id} channel={channel} />)}</div>;
}

export function EntertainmentGrid({ items }: { items: Entertainment[] }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{items.map((item) => <EntertainmentCard key={item.id} item={item} />)}</div>;
}

export function ChannelRail({ title, channels, href }: { title: string; channels: ChannelPreview[]; href?: string }) {
  return <section><SectionHeader title={title} href={href} /><div className="hide-scrollbar flex gap-4 overflow-x-auto pb-2">{channels.map((channel) => <ChannelCard key={channel.id} channel={channel} />)}</div></section>;
}

export function EntertainmentRail({ title, items, href }: { title: string; items: Entertainment[]; href?: string }) {
  return <section><SectionHeader title={title} href={href} /><div className="hide-scrollbar flex gap-4 overflow-x-auto pb-2">{items.map((item) => <EntertainmentCard key={item.id} item={item} />)}</div></section>;
}

export function BackLink({ href = "/", children = "Back" }: { href?: string; children?: React.ReactNode }) {
  return <Link href={href} className="tv-focus text-sm font-semibold text-muted hover:text-ink">← {children}</Link>;
}
