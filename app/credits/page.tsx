import Link from "next/link";

export default function CreditsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="animate-slide-up">
        <Link
          href="/"
          className="tv-focus inline-flex min-h-11 items-center rounded-full text-sm font-semibold text-zinc-400 hover:text-white"
        >
          ← Discover
        </Link>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-gradient md:text-5xl">
          Source information
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          PinFlix now uses MovieBox as its catalog, metadata and playback-availability provider.
        </p>
      </section>

      <section className="glass-panel rounded-3xl p-6 sm:p-8">
        <h2 className="text-xl font-bold text-white">MovieBox</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-300">
          PinFlix reads public MovieBox catalog pages and the MovieBox web data flow for titles,
          collections, search, details, series navigation and explicitly unlocked direct playback
          sources.
        </p>
        <p className="mt-3 text-sm leading-7 text-zinc-400">
          PinFlix does not replay protected VIP authorization material, provider cookies, DRM keys
          or signing secrets.
        </p>
        <a
          href="https://movie-box.co/"
          target="_blank"
          rel="noreferrer"
          className="tv-focus mt-5 inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10"
        >
          Visit MovieBox
        </a>
      </section>
    </div>
  );
}
