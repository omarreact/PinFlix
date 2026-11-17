"use client";
import { Shell } from "@/src/components/source-ui/shell";
import { FRANCHISE_COLLECTIONS } from "@/src/lib/franchise-collections";
import { CATALOGUE_GENRES } from "@/src/lib/catalogue";
import type { Category } from "@/src/lib/source-ui";
const categories: Category[] = (["movie", "series"] as const).flatMap((kind) =>
  [
    ...FRANCHISE_COLLECTIONS,
    ...CATALOGUE_GENRES.filter((genre) => genre.slug !== "adult"),
  ].map((genre) => ({
    name: genre.label,
    kind,
    mature: false,
  })),
);
export function AppShell({ children }: { children: React.ReactNode }) {
  return <Shell categories={categories}>{children}</Shell>;
}
