import Link from "next/link";
import type { ChannelPreview } from "@/src/types/catalog";
import { Card } from "@/src/components/ui/card";

export function ChannelCard({ channel }: { channel: ChannelPreview }) {
  const logoIsUrl = /^https?:\/\//i.test(channel.logo);
  const isLocal = channel.networkScope === "local";
  const providerLabel = channel.provider === "roarzone"
    ? "RoarZone"
    : channel.provider === "mango"
      ? "Mango"
      : "";

  return <Link href={`/watch/${channel.id}`} className="tv-focus group block min-w-[190px]"><Card interactive className="h-full p-4">
    <div className="relative flex aspect-[1.45] items-center justify-center overflow-hidden rounded-md text-5xl" style={{ background: `linear-gradient(135deg, ${channel.accent}55, #171d28)` }}>
      {logoIsUrl
        ? <img src={channel.logo} alt="" className="h-full w-full object-contain p-3" loading="lazy" />
        : channel.logo}
      {providerLabel && <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white">{providerLabel}</span>}
    </div>
    <div className="mt-3 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="truncate font-semibold">{channel.name}</h3>
        <p className="mt-1 truncate text-xs text-muted">{channel.category} · {channel.country}</p>
      </div>
      <span className={`mt-1 inline-flex min-h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[10px] font-bold uppercase ${isLocal ? "bg-warning/15 text-warning" : "bg-live/15 text-live"}`}>
        <i className={`h-1.5 w-1.5 rounded-full ${isLocal ? "bg-warning" : "bg-live"}`} />
        {isLocal ? "BDIX" : "Live"}
      </span>
    </div>
    <p className="mt-3 truncate text-xs text-subtle">{channel.epg?.now ?? channel.description}</p>
  </Card></Link>;
}
