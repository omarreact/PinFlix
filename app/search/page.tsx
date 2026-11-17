import { BrowsePage } from "@/src/components/source-ui/browse-page";
export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <BrowsePage
      params={params}
      kind={
        params.kind === "movie"
          ? "movie"
          : params.kind === "show" || params.kind === "series"
            ? "series"
            : undefined
      }
    />
  );
}
