import * as cineplexbd from "@/src/lib/providers/cineplexbd";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return Response.json(
      { entertainment: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const entertainment = await cineplexbd.search(query);

  return Response.json(
    { entertainment },
    { headers: { "Cache-Control": "no-store" } },
  );
}
