import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { entertainment as staticEntertainment } from "@/src/lib/iptv/catalog";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";

export default async function MoviesPage() {
  const latest = await cineplexbd.getLatest();
  const entertainment = [...staticEntertainment, ...latest];

  return <div className="space-y-8"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Movies & Shows</p><h1 className="mt-2 text-3xl font-black">Stories worth staying for</h1><p className="mt-2 text-muted">Explore the PinFlix entertainment catalog.</p></div><EntertainmentGrid items={entertainment} /></div>;
}
