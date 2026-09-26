"use client";

import { useCallback, useRef } from "react";
import type { ChannelPreview } from "@/src/types/catalog";
import { ChannelLogo } from "@/src/components/channel-logo";
import { cn } from "@/src/lib/utils";

export type ChannelLogoRowProps = {
  channels: ChannelPreview[];
  activeId?: string | null;
  onSelect?: (channel: ChannelPreview) => void;
  title?: string;
  className?: string;
};

/**
 * Horizontal circular channel row with desktop arrows.
 * On mobile wraps into a 4-column grid (OTT snapshot behavior).
 */
export function ChannelLogoRow({
  channels,
  activeId,
  onSelect,
  title,
  className,
}: ChannelLogoRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === "left" ? -el.clientWidth * 0.65 : el.clientWidth * 0.65,
      behavior: "smooth",
    });
  }, []);

  if (channels.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">No channels in this category</p>
    );
  }

  return (
    <section className={cn("relative", className)}>
      {title ? (
        <h2 className="mb-3 text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
      ) : null}

      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll("left")}
        className={cn(
          "tv-focus absolute -left-1 top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center",
          "rounded-full border border-line bg-surface/95 text-muted",
          "hover:border-brand hover:text-brand md:flex",
        )}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll("right")}
        className={cn(
          "tv-focus absolute -right-1 top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center",
          "rounded-full border border-line bg-surface/95 text-muted",
          "hover:border-brand hover:text-brand md:flex",
        )}
      >
        ›
      </button>

      <div
        ref={scrollerRef}
        className={cn(
          "hide-scrollbar flex gap-3 overflow-x-auto scroll-smooth px-1 py-2",
          "max-md:flex-wrap max-md:justify-center max-md:overflow-visible",
        )}
      >
        {channels.map((ch) => (
          <div
            key={ch.id}
            className="max-md:basis-[calc(25%-9px)] max-md:max-w-[calc(25%-9px)]"
          >
            <ChannelLogo
              channel={ch}
              isActive={ch.id === activeId}
              onSelect={onSelect}
              className="max-md:w-full"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
