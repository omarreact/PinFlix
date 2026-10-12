import { catalogProvider } from "@/src/lib/providers/catalog";
export const runtime = "nodejs";
export const preferredRegion = "sin1";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id") ?? "";
  const season = Number(params.get("season"));
  if (
    !catalogProvider.canHandleId(id) ||
    !Number.isInteger(season) ||
    season < 1 ||
    season > 999
  )
    return Response.json(
      { error: "Invalid series or season" },
      { status: 400 },
    );
  try {
    const navigation = await catalogProvider.getSeriesNavigation(id, season);
    return Response.json(navigation, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Episodes could not be loaded. Please try again." },
      { status: 503 },
    );
  }
}
