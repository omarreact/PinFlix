import Link from "next/link";
import type { ChannelPreview } from "@/src/types/catalog";
import { Card } from "@/src/components/ui/card";

export function ChannelCard({ channel }: { channel: ChannelPreview }) {
  return <Link href={`/watch/${channel.id}`} className="tv-focus group block min-w-[190px]"><Card interactive className="h-full p-4">
    <div className="flex aspect-[1.45] items-center justify-center rounded-md text-5xl" style={{ background: `linear-gradient(135deg, ${channel.accent}55, #171d28)` }}>{channel.logo}</div>
    <div className="mt-3 flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-semibold">{channel.name}</h3><p className="mt-1 truncate text-xs text-muted">{channel.category} · {channel.country}</p></div><span className="mt-1 inline-flex min-h-6 shrink-0 items-center gap-1 rounded-full bg-live/15 px-2 text-[10px] font-bold uppercase text-live"><i className="h-1.5 w-1.5 rounded-full bg-live" />Live</span></div>
    <p className="mt-3 truncate text-xs text-subtle">{channel.epg?.now}</p>
  </Card></Link>;
}
