import type { Entertainment } from "@/src/types/catalog";
import { normalizeTitle } from "@/src/lib/title-match-utils";
export const FRANCHISE_COLLECTIONS = [
  {
    slug: "marvel",
    label: "Marvel",
    queries: ["Marvel", "Avengers", "Spider-Man", "Iron Man", "Thor", "X-Men"],
  },
  {
    slug: "dc",
    label: "DC",
    queries: [
      "DC",
      "Batman",
      "Superman",
      "Justice League",
      "Wonder Woman",
      "The Flash",
    ],
  },
] as const;
export type Franchise = (typeof FRANCHISE_COLLECTIONS)[number]["slug"];
export function franchiseCollection(value: string | null | undefined) {
  return FRANCHISE_COLLECTIONS.find(
    (collection) => collection.slug === value?.trim().toLowerCase(),
  );
}
/** Publisher labels and recognizable title families, never synopsis keywords.
 * Exclude known unrelated titles sharing superhero names. */
export function matchesFranchise(
  item: Entertainment,
  franchise: Franchise,
): boolean {
  const title = normalizeTitle(item.title);
  const labels = [
    item.category ?? "",
    ...(item.collections ?? []),
    ...item.genres,
  ].map(normalizeTitle);
  if (franchise === "marvel") {
    if (
      labels.some((label) =>
        /^(marvel|marvel studios|marvel comics|marvel cinematic universe)$/.test(
          label,
        ),
      )
    )
      return true;
    if (/\bmarvel\b/.test(title)) return true;
    if (/^(?:avengers grimm|iron man the champion)\b/.test(title)) return false;
    if (/^(?:the )?avengers\b/.test(title))
      return (
        item.year !== 1998 && !(item.kind === "show" && item.year === 1961)
      );
    if (/^thor(?: s\d.*)?$/.test(title)) return item.year === 2011;
    if (/^thor (the dark world|ragnarok|love and thunder)\b/.test(title))
      return true;
    return (
      /^(?:spider man|iron man|x men|captain america|black panther|doctor strange|guardians of the galaxy|deadpool|wandavision|loki|daredevil|the punisher|jessica jones|luke cage|iron fist|the defenders|the wolverine|wolverine|the incredible hulk)\b/.test(
        title,
      ) && !/^loki ragnarok\b/.test(title)
    );
  }
  if (
    labels.some((label) =>
      /^(dc|dc comics|dc studios|dc universe|dceu)$/.test(label),
    )
  )
    return true;
  if (/^the flash\b/.test(title))
    return item.year === undefined || [1990, 2014, 2023].includes(item.year);
  return /^(?:dc (?:showcase|league|s legends|super hero|comics|universe)\b|batman\b|superman\b|justice league\b|wonder woman\b|aquaman\b|shazam\b|suicide squad\b|the suicide squad\b|man of steel\b|the dark knight\b|the batman\b|the penguin\b|supergirl\b|peacemaker\b|blue beetle\b|black adam\b)/.test(
    title,
  );
}
