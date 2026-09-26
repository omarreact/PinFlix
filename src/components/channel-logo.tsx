"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChannelPreview } from "@/src/types/catalog";
import { cn } from "@/src/lib/utils";

function monogram(name: string): string {
  const parts = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "A";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

export type ChannelLogoProps = {
  channel: ChannelPreview;
  size?: "sm" | "md" | "lg";
  /** Button mode for in-page channel switching (watch page) */
  onSelect?: (channel: ChannelPreview) => void;
  isActive?: boolean;
  className?: string;
};

const sizeClass = {
  sm: "size-14",
  md: "size-[76px]",
  lg: "size-24",
} as const;

/**
 * Circular channel logo — OTT-style visual for PinFlix dark UI.
 * Links to /watch/[id] by default; pass onSelect for in-page switching.
 */
export function ChannelLogo({
  channel,
  size = "md",
  onSelect,
  isActive = false,
  className,
}: ChannelLogoProps) {
  const [failed, setFailed] = useState(false);
  const available = channel.availability !== "offline";
  const logoIsUrl = /^https?:\/\//i.test(channel.logo);
  const showLogo = logoIsUrl && !failed;

  const disk = (
    <span
      className={cn(
        "channel-logo-hover relative flex items-center justify-center overflow-hidden rounded-full border-2 bg-white p-1.5 shadow-sm",
        sizeClass[size],
        isActive
          ? "border-brand shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_35%,transparent)]"
          : "border-line group-hover:border-brand",
        !available && "opacity-55",
      )}
      style={
        !showLogo
          ? { background: `linear-gradient(135deg, ${channel.accent}88, #171d28)` }
          : undefined
      }
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={channel.logo}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full rounded-full object-contain"
        />
      ) : (
        <span className="text-sm font-black text-fg/90">
          {logoIsUrl ? monogram(channel.name) : channel.logo || monogram(channel.name)}
        </span>
      )}
      {!available ? (
        <span className="absolute inset-x-0 bottom-0 bg-bg/85 py-0.5 text-center text-[8px] font-bold uppercase tracking-wide text-muted">
          Off
        </span>
      ) : null}
    </span>
  );

  const label = (
    <span className="mt-1.5 max-w-[80px] truncate text-center text-[11px] font-semibold text-fg">
      {channel.name}
    </span>
  );

  const shared = cn(
    "group tv-focus flex shrink-0 flex-col items-center outline-none",
    !available && "cursor-not-allowed",
    className,
  );

  if (onSelect) {
    return (
      <button
        type="button"
        disabled={!available}
        aria-label={available ? `Play ${channel.name}` : `${channel.name} unavailable`}
        aria-pressed={isActive}
        onClick={() => available && onSelect(channel)}
        className={shared}
      >
        {disk}
        {label}
      </button>
    );
  }

  return (
    <Link
      href={`/watch/${channel.id}`}
      prefetch={false}
      aria-label={available ? `Watch ${channel.name}` : `${channel.name} unavailable`}
      aria-disabled={!available}
      tabIndex={available ? 0 : -1}
      onClick={(e) => {
        if (!available) e.preventDefault();
      }}
      className={shared}
    >
      {disk}
      {label}
    </Link>
  );
}
