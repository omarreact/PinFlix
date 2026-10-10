import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import type { Entertainment } from "@/src/types/catalog";

export function EntertainmentCard({item}:{item:Entertainment}) {
  const details=item.provider==="tmdb"&&item.providerId?`/title/${item.kind==="show"?"tv":"movie"}/${item.providerId}`:`/entertainment/${item.id}`;
  return <article className="group min-w-0">
    <Link href={details} className="pf-poster media-focus group relative block" aria-label={`Explore ${item.title}`}>
      {item.poster?<img src={item.poster} alt="" loading="lazy" decoding="async"/>:<div className="poster-fallback grid h-full place-items-center p-5 text-center text-sm font-semibold text-muted">{item.title}</div>}
      <span className="pf-poster-tag">{item.rating&&item.rating>0?<span className="inline-flex items-center gap-1"><Star size={12} fill="currentColor"/> {item.rating.toFixed(1)}</span>:item.kind==="show"?"SERIES":"FILM"}</span>
      <span className="absolute bottom-3 right-3 z-[1] grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-bg/75 text-fg" aria-hidden="true"><ArrowUpRight size={17}/></span>
    </Link>
    <p className="pf-film-meta mt-3">{[item.year||"",item.kind==="show"?"Series":item.genres[0]||"Movie"].filter(Boolean).join(" · ")}</p>
    <h3 className="pf-film-title mt-1"><Link href={details} className="hover:text-brand">{item.title}</Link></h3>
  </article>;
}
