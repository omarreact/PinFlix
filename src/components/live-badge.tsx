import { cn } from "@/src/lib/utils";

export type LiveBadgeProps = {
  count?: number | string;
  label?: string;
  className?: string;
};

/** Pulsing presence / health badge. */
export function LiveBadge({
  count,
  label = "Live",
  className,
}: LiveBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1",
        "text-[11px] font-semibold text-success",
        className,
      )}
    >
      <span
        className="inline-block size-1.5 shrink-0 rounded-full bg-success animate-live-pulse"
        aria-hidden
      />
      {count !== undefined ? (
        <span>
          <strong className="font-bold">{count}</strong> {label}
        </span>
      ) : (
        <span>{label}</span>
      )}
    </span>
  );
}
