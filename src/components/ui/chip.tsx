import Link from "next/link";
export function Chip({ label, href, active }: { label: string; href?: string; active?: boolean }) {
  const className = `tv-focus inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium ${active ? "border-brand bg-brand text-white" : "border-border bg-surface text-muted hover:border-panel hover:bg-elevated hover:text-fg"}`;
  return href ? <Link className={className} href={href}>{label}</Link> : <button className={className}>{label}</button>;
}
