import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeader({ title, eyebrow, href }: { title: string; eyebrow?: string; href?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-accent">{eyebrow}</p>}
        <h2 className="text-2xl font-medium tracking-[-.04em] text-fg md:text-3xl">{title}</h2>
      </div>
      {href && (
        <Link className="tv-focus inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-semibold text-muted hover:text-white" href={href}>
          View all <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}
