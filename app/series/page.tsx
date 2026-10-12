import { BrowsePage } from "@/src/components/source-ui/browse-page";
export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";
export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <BrowsePage params={params} kind="series" />;
}
