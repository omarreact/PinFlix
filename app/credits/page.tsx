import Image from "next/image";
import Link from "next/link";

const TMDB_LOGO =
  "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_1-5bdc75aaebeb75dc7ae79426ddd9be3b2be1e342510f8202baf6bffa71d7f5c4.svg";

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
          Credits
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Data and imagery acknowledgements used by PinFlix discovery features.
        </p>
      </section>

      <section className="glass-panel rounded-3xl p-6 sm:p-8">
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noreferrer"
          className="tv-focus inline-flex rounded-2xl p-1"
          aria-label="Visit The Movie Database"
        >
          <Image
            src={TMDB_LOGO}
            alt="TMDB"
            width={96}
            height={96}
            className="h-20 w-20 object-contain sm:h-24 sm:w-24"
          />
        </a>

        <h2 className="mt-6 text-xl font-bold text-white">The Movie Database (TMDB)</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-300">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p className="mt-3 text-sm leading-7 text-zinc-400">
          TMDB supplies discovery metadata and images. PinFlix keeps discovery metadata separate
          from playback availability.
        </p>
      </section>
    </div>
  );
}
