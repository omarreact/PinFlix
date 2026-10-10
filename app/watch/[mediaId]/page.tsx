import { redirect } from "next/navigation";

type SearchParams = Promise<{ season?: string; episode?: string }>;
function positive(value: string | undefined): string | null {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 999 ? String(number) : null;
}

/** Existing watch and saved-history URLs remain valid. Playback now starts
 * inside the movie detail banner instead of a dedicated video-only page.
 */
export default async function LegacyWatchRedirect({
  params, searchParams,
}: {
  params: Promise<{ mediaId: string }>;
  searchParams: SearchParams;
}) {
  const [{ mediaId }, query] = await Promise.all([params, searchParams]);
  const qs = new URLSearchParams({ autoplay: "1" });
  const season = positive(query.season);
  const episode = positive(query.episode);
  if (season) qs.set("season", season);
  if (episode) qs.set("episode", episode);
  redirect(`/entertainment/${encodeURIComponent(mediaId)}?${qs}`);
}
