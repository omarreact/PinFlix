import Link from "next/link";
import { notFound } from "next/navigation";
import { Play } from "lucide-react";
import { BackLink } from "@/src/components/catalog-sections";
import { SavedToggle } from "@/src/components/saved-toggle";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";

export const dynamic = "force-dynamic";

export default async function EntertainmentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug.startsWith("cb-")) notFound();

  const item = await cineplexbd.getDetails(slug);
  if (!item) notFound();

  const metadata = [
    item.kind === "show" ? "Series" : "Movie",
    item.year !== undefined ? String(item.year) : "",
    item.rating !== undefined ? `★ ${item.rating}` : "",
    ...item.genres,
    item.episodes ? `${item.episodes} episodes` : "",
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <BackLink href={item.kind === "show" ? "/series" : "/movies"}>
        {item.kind === "show" ? "Series" : "Movies"}
      </BackLink>

      <section className="relative min-h-[620px] overflow-hidden rounded-[28px] border border-white/10 bg-surface">
        {item.backdrop && <img src={item.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />}
        <div className="hero-vignette absolute inset-0" />
        <div className="hero-side-fade absolute inset-0" />

        <div className="relative z-10 flex min-h-[620px] items-end p-6 sm:p-10 md:items-center md:p-12">
          <div className="grid w-full gap-8 md:grid-cols-[180px_minmax(0,1fr)] md:items-end lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl md:block">
              {item.poster ? (
                <img src={item.poster} alt="" className="aspect-[2/3] w-full object-cover" />
              ) : (
                <div className="poster-fallback aspect-[2/3] w-full" />
              )}
            </div>

            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-accent">PinFlix {item.kind === "show" ? "Series" : "Movie"}</p>
              <h1 className="text-gradient mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl md:text-6xl">{item.title}</h1>
              {metadata.length > 0 && <p className="mt-4 text-sm font-medium text-zinc-300">{metadata.join(" · ")}</p>}
              {item.synopsis && <p className="mt-5 max-w-2xl text-sm font-light leading-7 text-zinc-300 sm:text-base">{item.synopsis}</p>}

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/watch/${item.id}`} className="tv-focus accent-gradient inline-flex min-h-12 items-center gap-2 rounded-full px-7 py-3 font-bold text-white shadow-[0_0_30px_rgba(168,85,247,.22)]">
                  <Play size={18} fill="currentColor" />
                  Play
                </Link>
                <SavedToggle
                  item={{
                    id: item.id,
                    slug: item.slug,
                    title: item.title,
                    kind: item.kind,
                    poster: item.poster,
                    year: item.year,
                    genres: item.genres,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
