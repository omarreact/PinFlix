import { catalogProvider } from "@/src/lib/providers/catalog";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id") ?? "";
  if (!catalogProvider.canHandleId(id)) return Response.json({ error: "Invalid title ID" }, { status: 400 });
  const item = await catalogProvider.getDetails(id);
  if (!item) return Response.json({ error: "Title not found" }, { status: 404 });
  const requested = Number(params.get("season"));
  const season = Number.isInteger(requested) && requested > 0 && requested <= 500 ? requested : 1;
  const navigation = item.kind === "show" ? await catalogProvider.getSeriesNavigation(id, season) : null;
  return Response.json({ item, navigation }, { headers: { "Cache-Control": "private, no-store" } });
}
