import Link from "next/link";
import { EntertainmentCard } from "@/src/components/entertainment/card";
import { SectionHeader } from "@/src/components/ui/section-header";
import type { Entertainment } from "@/src/types/catalog";

export function EntertainmentGrid({ items }: { items: Entertainment[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-6">
      {items.map((item) => <EntertainmentCard key={item.id} item={item} />)}
    </div>
  );
}

export function EntertainmentRail({ title, items, href }: { title: string; items: Entertainment[]; href?: string }) {
  return (
    <section className="animate-slide-up">
      <SectionHeader title={title} href={href} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 md:gap-6">
        {items.slice(0, 12).map((item) => <EntertainmentCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

export function BackLink({ href = "/", children = "Back" }: { href?: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="tv-focus inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-zinc-300 hover:bg-white/10 hover:text-white">
      ← {children}
    </Link>
  );
}
