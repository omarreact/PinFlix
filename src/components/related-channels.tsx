"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChannelPreview } from "@/src/types/catalog";
import { CategoryPills } from "@/src/components/category-pills";
import { ChannelLogoRow } from "@/src/components/channel-logo-row";

export type RelatedChannelsProps = {
  channels: ChannelPreview[];
  currentId: string;
  /** Prefer same category first */
  preferCategory?: string;
};

/**
 * Watch-page companion: category pills + circular logos for quick switching.
 */
export function RelatedChannels({
  channels,
  currentId,
  preferCategory,
}: RelatedChannelsProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(
    preferCategory ? preferCategory.toLowerCase() : "all",
  );

  const categories = useMemo(() => {
    const set = new Set(
      channels.map((c) => c.category).filter(Boolean),
    );
    return [
      { id: "all", label: "All" },
      ...[...set].sort().map((name) => ({
        id: name.toLowerCase(),
        label: name,
      })),
    ];
  }, [channels]);

  const filtered = useMemo(() => {
    const list =
      activeCategory === "all"
        ? channels
        : channels.filter(
            (c) => c.category.toLowerCase() === activeCategory,
          );
    // keep current near the start if present
    return [...list].sort((a, b) => {
      if (a.id === currentId) return -1;
      if (b.id === currentId) return 1;
      return 0;
    });
  }, [activeCategory, channels, currentId]);

  if (channels.length === 0) return null;

  return (
    <div className="space-y-4 border-t border-line/60 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">More channels</h2>
      </div>
      <CategoryPills
        items={categories}
        activeId={activeCategory}
        onChange={setActiveCategory}
      />
      <ChannelLogoRow
        channels={filtered}
        activeId={currentId}
        onSelect={(ch) => {
          if (ch.id !== currentId) router.push(`/watch/${ch.id}`);
        }}
      />
    </div>
  );
}
