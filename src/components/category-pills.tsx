"use client";

import { cn } from "@/src/lib/utils";

export type CategoryPill = {
  id: string;
  label: string;
};

export type CategoryPillsProps = {
  items: CategoryPill[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
};

/**
 * Horizontal filter pills (OTT-style), client-side.
 * For server-driven filters prefer Link chips (see browse page).
 */
export function CategoryPills({
  items,
  activeId,
  onChange,
  className,
}: CategoryPillsProps) {
  return (
    <div
      className={cn("hide-scrollbar flex gap-2 overflow-x-auto py-1", className)}
      role="tablist"
      aria-label="Categories"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "tv-focus shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "border-brand bg-brand text-black"
                : "border-line bg-surface text-muted hover:border-panel hover:bg-elevated hover:text-fg",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
