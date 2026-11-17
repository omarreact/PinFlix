import Link from "next/link";

export default function CreditsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="">
        <Link
          href="/"
          className="tv-focus inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-muted hover:text-white"
        >
          ← Discover
        </Link>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-fg md:text-5xl">
          Source information
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          PinFlix uses the current provider catalog for playback and TMDB metadata where configured.
        </p>
      </section>

      <section className="glass-panel rounded-lg p-6 sm:p-8">
        <h2 className="text-xl font-bold text-white">Playback and metadata</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-300">
          Catalog search, title discovery, series information and playback resolution are handled
          through the configured PinFlix provider adapter.
        </p>
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noreferrer"
          className="tv-focus mt-5 inline-flex min-h-11 items-center rounded-md border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10"
        >
          View TMDB credits
        </a>
      </section>
    </div>
  );
}
