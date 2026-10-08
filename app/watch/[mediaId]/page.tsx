import { WatchClient } from "@/src/components/watch-client";

type SearchParams = Promise<{
  season?: string;
  episode?: string;
}>;

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ mediaId: string }>;
  searchParams: SearchParams;
}) {
  const [{ mediaId }, query] = await Promise.all([params, searchParams]);
  const requestedSeason = positiveInteger(query.season, 1);
  const requestedEpisode = positiveInteger(query.episode, 1);

  return (
    <WatchClient
      mediaId={mediaId}
      requestedSeason={requestedSeason}
      requestedEpisode={requestedEpisode}
    />
  );
}
