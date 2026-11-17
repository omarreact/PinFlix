import Link from "next/link";
import { EntertainmentCard } from "@/src/components/entertainment/card";
import { SectionHeader } from "@/src/components/ui/section-header";
import type { Entertainment } from "@/src/types/catalog";

export function EntertainmentGrid({ items }: { items: Entertainment[] }) {
  return (
    <div className="card-grid">
      {items.map((item) => (
        <EntertainmentCard key={item.id} item={item} />
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
    <section className="space-y-3">
      <SectionHeader title={title} href={href} />
      <div className="card-row">
        {items.slice(0, 12).map((item) => (
          <EntertainmentCard key={item.id} item={item} />
        ))}
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
      className="tv-focus inline-flex min-h-11 items-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-zinc-300 hover:bg-white/10 hover:text-white"
    >
      ← {children}
    </Link>
  );
}
