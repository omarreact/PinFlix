import Link from "next/link";

export function SectionHeader({
  title,
  eyebrow,
  href,
}: {
  title: string;
  eyebrow?: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-extrabold uppercase tracking-[.18em] text-brand">{eyebrow}</p>
        )}
        <h2 className="text-xl font-black tracking-[-0.02em] text-slate-950 sm:text-2xl">{title}</h2>
      </div>
      {href && (
        <Link
          className="tv-focus inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-muted hover:text-brand"
          href={href}
        >
          See all →
        </Link>
      )}
    </div>
  );
}
