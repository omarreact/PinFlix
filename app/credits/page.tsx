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
          PinFlix uses CineplexBD as its catalog and playback provider.
        </p>
      </section>

      <section className="glass-panel rounded-3xl p-6 sm:p-8">
        <h2 className="text-xl font-bold text-white">CineplexBD</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-300">
          Catalog search, title discovery, series information and playback resolution are handled
          through the CineplexBD provider adapter.
        </p>
        <a
          href="http://cineplexbd.net/"
          target="_blank"
          rel="noreferrer"
          className="tv-focus mt-5 inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10"
        >
          Visit CineplexBD
        </a>
      </section>
    </div>
  );
}
