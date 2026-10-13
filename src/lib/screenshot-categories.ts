import type { Entertainment } from "@/src/types/catalog";
export type ScreenshotCategory = {
  name: string;
  kind: "movie" | "series";
  group: string;
  country?: string[];
  excludeCountries?: string[];
  notice?: string;
  language?: string;
  excludeLanguages?: string[];
  genre?: string;
  dubbed?: boolean;
  resolution?: number;
  unavailable?: string;
};
const regions: [string, string[], string][] = [
  ["Bangla", ["Bangladesh"], "bn"],
  ["Bangla Movies", ["Bangladesh"], "bn"],
  ["Chinese", ["China", "Hong Kong", "Taiwan"], "zh"],
  ["English", ["United States", "United Kingdom", "Australia", "Canada"], "en"],
  ["Hindi", ["India"], "hi"],
  ["Indian Bangla", ["India"], "bn"],
  ["Indonesian", ["Indonesia"], "id"],
  ["Italy Movies", ["Italy"], "it"],
  ["Japanese", ["Japan"], "ja"],
  ["Korean", ["South Korea", "Korea"], "ko"],
  ["Pakistani", ["Pakistan"], "ur"],
  ["Punjabi", ["India", "Pakistan"], "pa"],
  ["Turkey Movies", ["Turkey", "Türkiye"], "tr"],
];
export const SCREENSHOT_CATEGORIES: ScreenshotCategory[] = [
  {
    name: "3D Movies",
    kind: "movie",
    group: "Categories",
    unavailable: "The connected catalogue does not expose verified 3D formats.",
  },
  { name: "4K Movies", kind: "movie", group: "Categories", resolution: 2160 },
  { name: "Animation", kind: "movie", group: "Categories", genre: "Animation" },
  {
    name: "Anime",
    kind: "movie",
    group: "Categories",
    country: ["Japan"],
    genre: "Animation",
  },
  ...regions.map(([name, country, language]) => ({
    name,
    country,
    language,
    kind: "movie" as const,
    group: "Categories",
  })),
  {
    name: "Bangla Dubbed",
    kind: "movie",
    group: "Categories",
    language: "bn",
    dubbed: true,
  },
  {
    name: "Hindi Dubbed",
    kind: "movie",
    group: "Categories",
    language: "hi",
    dubbed: true,
  },
  {
    name: "Documentaries",
    kind: "movie",
    group: "Categories",
    genre: "Documentary",
  },
  {
    name: "Documentary",
    kind: "movie",
    group: "Categories",
    genre: "Documentary",
  },
  {
    name: "Dual Audio",
    kind: "movie",
    group: "Categories",
    unavailable:
      "Separate dubbed versions are available; a dual-audio file is not verified.",
  },
  {
    name: "Exclusive Full HD",
    kind: "movie",
    group: "Categories",
    unavailable:
      "The connected catalogue does not identify exclusive editions.",
  },
  {
    name: "Foreign",
    kind: "movie",
    group: "Categories",
    excludeCountries: ["Bangladesh"],
    notice:
      "Foreign movies are productions outside Bangladesh, filtered by verified country metadata.",
  },
  {
    name: "Kids Cartoon",
    kind: "movie",
    group: "Categories",
    genre: "Animation,Family",
  },
  ...[
    "Chinese",
    "English",
    "Indonesian",
    "Italy",
    "Japanese",
    "Korean",
    "Tamil",
  ].map((name) => ({
    name: `Hindi Dubbed/${name} Movies`,
    kind: "movie" as const,
    group: "Hindi Dubbed",
    language: "hi",
    dubbed: true,
    country:
      name === "Tamil"
        ? ["India"]
        : regions.find((region) => region[0].startsWith(name))?.[1],
  })),
  { name: "All TV Series", kind: "series", group: "TV Series" },
  {
    name: "All Animation Series",
    kind: "series",
    group: "Animation Series",
    genre: "Animation",
  },
  ...[
    ["Bangla", "bn"],
    ["Hindi", "hi"],
    ["English", "en"],
  ].map(([label, language]) => ({
    name: `${label} Animation`,
    kind: "series" as const,
    group: "Animation Series",
    language,
    genre: "Animation",
  })),
  {
    name: "Others Animation",
    kind: "series",
    group: "Animation Series",
    genre: "Animation",
    excludeLanguages: ["bn", "hi", "en"],
  },
  { name: "Award Shows", kind: "series", group: "TV Series", genre: "Awards" },
  { name: "Bangla Series", kind: "series", group: "TV Series", language: "bn" },
  {
    name: "Islamic Series",
    kind: "series",
    group: "TV Series",
    genre: "Islamic",
  },
  { name: "Web Series", kind: "series", group: "TV Series" },
  {
    name: "Documentary Series",
    kind: "series",
    group: "TV Series",
    genre: "Documentary",
  },
  { name: "WWE", kind: "series", group: "TV Series" },
];
export function screenshotCategory(value: string | null | undefined) {
  return SCREENSHOT_CATEGORIES.find(
    (category) => category.name.toLowerCase() === value?.toLowerCase(),
  );
}
export function matchesScreenshotCategory(
  item: Entertainment,
  category: ScreenshotCategory,
): boolean {
  if (category.unavailable) return false;
  if (
    category.genre &&
    !category.genre
      .split(",")
      .every((genre) =>
        item.genres.some(
          (value) => value.toLowerCase() === genre.toLowerCase(),
        ),
      )
  )
    return false;
  if (
    category.country &&
    !category.country.some((country) =>
      item.country
        ?.split(",")
        .some((value) => value.trim().toLowerCase() === country.toLowerCase()),
    )
  )
    return false;
  if (category.excludeCountries) {
    const countries = item.country
      ?.split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (
      !countries?.length ||
      countries.some((country) =>
        category.excludeCountries!.some(
          (excluded) => excluded.toLowerCase() === country,
        ),
      )
    )
      return false;
  }
  if (category.language && !item.audioLanguages?.includes(category.language))
    return false;
  if (
    category.excludeLanguages &&
    (!item.audioLanguages?.length ||
      !item.audioLanguages.some(
        (language) => !category.excludeLanguages!.includes(language),
      ))
  )
    return false;
  if (category.dubbed && !item.dubbed) return false;
  if (
    category.resolution &&
    !item.resolutions?.some((value) => value >= category.resolution!)
  )
    return false;
  if (category.name === "WWE" && !/\bwwe\b/i.test(item.title)) return false;
  return item.kind === (category.kind === "series" ? "show" : "movie");
}
