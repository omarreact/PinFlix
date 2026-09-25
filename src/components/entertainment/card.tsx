import Link from "next/link";
import type { Entertainment } from "@/src/types/catalog";
import { Card } from "@/src/components/ui/card";

export function EntertainmentCard({ item }: { item: Entertainment }) {
  const meta = [item.year ? String(item.year) : "", item.genres[0] || ""].filter(Boolean).join(" · ");

  return <Link href={`/entertainment/${item.slug}`} className="tv-focus group block min-w-[180px]"><Card interactive className="overflow-hidden border-transparent bg-transparent">
    <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-surface">
      {item.poster ? <img src={item.poster} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-4xl text-muted" aria-hidden>🎬</div>}
      {item.rating !== undefined && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-10"><span className="text-xs font-semibold text-warning">★ {item.rating}</span></div>}
    </div>
    <h3 className="mt-3 font-semibold">{item.title}</h3>
    {meta && <p className="mt-1 text-xs text-muted">{meta}</p>}
  </Card></Link>;
}
