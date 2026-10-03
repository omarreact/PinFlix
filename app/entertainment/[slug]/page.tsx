import Link from "next/link";
import { notFound } from "next/navigation";
import { Play } from "lucide-react";
import { BackLink } from "@/src/components/catalog-sections";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";

export const dynamic = "force-dynamic";

export default async function EntertainmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!slug.startsWith("cb-")) notFound();

  const item = await cineplexbd.getDetails(slug);
  if (!item) notFound();

  const metadata = [
    item.year !== undefined ? String(item.year) : "",
    item.rating !== undefined ? `★ ${item.rating}` : "",
    ...item.genres,
    item.episodes ? `${item.episodes} episodes` : "",
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <BackLink href={item.kind === "show" ? "/series" : "/movies"}>
        {item.kind === "show" ? "Web Series" : "Movies"}
      </BackLink>

      <section className="relative min-h-[30rem] overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_18px_55px_rgba(15,23,42,.08)]">
        {item.backdrop && (
          <img src={item.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="hero-gradient absolute inset-0" />
        <div className="relative flex min-h-[30rem] items-end p-6 sm:p-9 md:items-center md:p-12">
          <div className="max-w-2xl rounded-3xl bg-white/88 p-6 shadow-sm backdrop-blur-md sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand">
              {item.kind === "show" ? "Web Series" : "Movie"}
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.04em] text-slate-950 md:text-6xl">{item.title}</h1>
            {metadata.length > 0 && <p className="mt-4 text-sm font-semibold text-slate-600">{metadata.join(" · ")}</p>}
            {item.synopsis && <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">{item.synopsis}</p>}
            <Link
              href={`/watch/${item.id}`}
              className="tv-focus mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white shadow-lg shadow-violet-200"
            >
              <Play size={18} fill="currentColor" />
              Play now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
