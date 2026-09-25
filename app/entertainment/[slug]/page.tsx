import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/src/components/catalog-sections";
import { findEntertainment } from "@/src/lib/iptv/catalog";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";

export default async function EntertainmentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  let item = findEntertainment(slug);
  if (!item && slug.startsWith("cb-")) {
    item = await cineplexbd.getDetails(slug) || undefined;
  }

  if (!item) notFound();
  return <div className="space-y-6"><BackLink href="/movies">Movies & Shows</BackLink><section className="relative min-h-[28rem] overflow-hidden rounded-3xl border border-line bg-surface"><img src={item.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" /><div className="hero-gradient absolute inset-0" /><div className="relative flex min-h-[28rem] items-end p-7 md:p-12"><div className="max-w-2xl"><p className="text-sm font-bold text-brand">{item.kind === "show" ? "Series" : "Movie"} · {item.year}</p><h1 className="mt-2 text-4xl font-black md:text-6xl">{item.title}</h1><p className="mt-4 text-muted">{item.synopsis}</p><p className="mt-4 text-sm text-muted">★ {item.rating} · {item.genres.join(" · ")}{item.episodes ? ` · ${item.episodes} episodes` : ""}</p><Link href={`/watch/${item.id}`} className="tv-focus mt-7 inline-block rounded-xl bg-brand px-5 py-3 font-bold">Play now</Link></div></div></section></div>;
}
