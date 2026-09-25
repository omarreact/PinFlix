import Link from "next/link";
import { Plus, Play } from "lucide-react";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-line">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-black/20" />
      <div className="relative flex min-h-[220px] flex-col justify-between p-5 md:min-h-[320px] md:p-8">
        <div className="flex items-center gap-3">
          <Link
            href="/watch/pin-news"
            className="tv-focus grid h-14 w-14 place-items-center rounded-2xl bg-coral text-white shadow-lg shadow-coral/30"
            aria-label="Play featured"
          >
            <Play size={26} fill="currentColor" />
          </Link>
          <Link
            href="/saved"
            className="tv-focus grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-fg backdrop-blur-md"
            aria-label="Add to list"
          >
            <Plus size={26} />
          </Link>
        </div>
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">Featured</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
            Watch the world live
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/75 md:text-base">
            Curated live channels and entertainment, ready when you are.
          </p>
        </div>
      </div>
    </section>
  );
}
