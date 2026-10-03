import Link from "next/link";
import { EntertainmentCard } from "@/src/components/entertainment/card";
import { SectionHeader } from "@/src/components/ui/section-header";
import type { Entertainment } from "@/src/types/catalog";

export function EntertainmentGrid({ items }: { items: Entertainment[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {items.map((item) => (
        <div key={item.id} className="min-w-0 [&>a]:w-full">
          <EntertainmentCard item={item} />
        </div>
      ))}
    </div>
  );
}

export function EntertainmentRail({
  title,
  items,
  href,
}: {
  title: string;
  items: Entertainment[];
  href?: string;
}) {
  return (
    <section>
      <SectionHeader title={title} href={href} />
      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-3 sm:gap-4">
        {items.map((item) => <EntertainmentCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

export function BackLink({
  href = "/",
  children = "Back",
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="tv-focus inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-muted hover:text-slate-950"
    >
      ← {children}
    </Link>
  );
}
