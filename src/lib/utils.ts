export function cn(...classes: Array<string | false | null | undefined>) { return classes.filter(Boolean).join(" "); }
export function formatRating(rating: number) { return rating.toFixed(1); }
