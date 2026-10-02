import Link from "next/link";
import { Info, Play } from "lucide-react";
import type { Entertainment } from "@/src/types/catalog";

export function HomeHero({ item }: { item?: Entertainment }) {
  const image = item?.backdrop || item?.poster || "";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-surface">
      {image ? (
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand/30 via-panel to-bg" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-black/20" />
      <div className="relative flex min-h-[250px] flex-col justify-end p-5 md:min-h-[360px] md:p-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
            {item ? "Recently added" : "PinFlix"}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
            {item?.title || "Movies and web series, all in one place"}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/80 md:text-base">
            {item?.synopsis || "Browse the latest CineplexBD movies and web series and start watching directly in PinFlix."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {item ? (
              <>
                <Link
                  href={`/watch/${item.id}`}
                  className="tv-focus inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-black"
                >
                  <Play size={18} fill="currentColor" />
                  Play
                </Link>
                <Link
                  href={`/entertainment/${item.slug}`}
                  className="tv-focus inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-5 py-3 font-bold text-white backdrop-blur"
                >
                  <Info size={18} />
                  Details
                </Link>
              </>
            ) : (
              <>
                <Link href="/movies" className="tv-focus rounded-xl bg-white px-5 py-3 font-bold text-black">
                  Browse movies
                </Link>
                <Link href="/series" className="tv-focus rounded-xl bg-white/15 px-5 py-3 font-bold text-white backdrop-blur">
                  Browse web series
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
