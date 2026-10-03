import Link from "next/link";
import { Play } from "lucide-react";
import type { Entertainment } from "@/src/types/catalog";
import { Card } from "@/src/components/ui/card";

export function EntertainmentCard({ item }: { item: Entertainment }) {
  const meta = [item.year ? String(item.year) : "", item.genres[0] || ""].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/entertainment/${item.slug}`}
      className="tv-focus group block w-[155px] shrink-0 sm:w-[175px] lg:w-[190px]"
      aria-label={`View ${item.title}`}
    >
      <Card interactive className="overflow-visible border-0 bg-transparent p-0 shadow-none">
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-line bg-slate-100 shadow-sm">
          {item.poster ? (
            <img
              src={item.poster}
              alt=""
              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.035]"
            />
          ) : (
            <div className="grid h-full place-items-center text-4xl text-muted" aria-hidden>🎬</div>
          )}

          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-700 shadow-sm backdrop-blur">
              {item.kind === "show" ? "Series" : "Movie"}
            </span>
            {item.rating !== undefined && (
              <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                ★ {item.rating}
              </span>
            )}
          </div>

          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-slate-950/70 via-transparent to-transparent p-3 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            <div className="flex w-full items-center justify-between gap-2 text-white">
              <span className="text-xs font-semibold">{item.year || "Play"}</span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-950 shadow-lg">
                <Play size={15} fill="currentColor" />
              </span>
            </div>
          </div>
        </div>

        <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-5 text-slate-900">{item.title}</h3>
        {meta && <p className="mt-1 truncate text-xs text-muted">{meta}</p>}
      </Card>
    </Link>
  );
}
