import type { TMDBMedia } from "@/src/lib/tmdb/types";
import { TMDBMediaCard } from "./media-card";

export function TMDBMediaRow({ title, items }: { title: string; items: TMDBMedia[] }) {
  if (!items.length) return null;
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-brand">TMDB discovery</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-white">{title}</h2>
        </div>
      </div>
      <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-5">
        {items.map((media, index) => (
          <div key={`${media.media_type ?? "media"}-${media.id}`} className="w-[44%] shrink-0 sm:w-[29%] md:w-[22%] lg:w-[17%] xl:w-[14%]">
            <TMDBMediaCard media={media} priority={index < 4} />
          </div>
        ))}
      </div>
    </section>
  );
}
