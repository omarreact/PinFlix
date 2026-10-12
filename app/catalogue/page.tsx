import { redirect } from "next/navigation";
import { BrowsePage } from "@/src/components/source-ui/browse-page";
export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";
export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  if (params.genre === "adult") redirect("/catalogue/adult");
  if (params.kind === "show") params.kind = "series";
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
