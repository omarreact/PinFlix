import Link from "next/link";

export function SectionHeader({ title, eyebrow, href }: { title: string; eyebrow?: string; href?: string }) {
  return <div className="mb-4 flex items-end justify-between gap-4"><div>{eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-brand">{eyebrow}</p>}<h2 className="text-xl font-bold tracking-tight">{title}</h2></div>{href && <Link className="tv-focus inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-fg" href={href}>See all →</Link>}</div>;
}
