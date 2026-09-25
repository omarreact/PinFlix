import Link from "next/link";
import type { Entertainment } from "@/src/types/catalog";
import { Card } from "@/src/components/ui/card";

export function EntertainmentCard({ item }: { item: Entertainment }) {
  return <Link href={`/entertainment/${item.slug}`} className="tv-focus group block min-w-[180px]"><Card interactive className="overflow-hidden border-transparent bg-transparent">
    <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-surface"><img src={item.poster} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-10"><span className="text-xs font-semibold text-warning">★ {item.rating}</span></div></div><h3 className="mt-3 font-semibold">{item.title}</h3><p className="mt-1 text-xs text-muted">{item.year} · {item.genres[0]}</p>
  </Card></Link>;
}
