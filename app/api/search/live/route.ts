import { searchLibrary } from "@/src/lib/search-service";
import { safeSearchKind, safeSearchQuery } from "@/src/lib/search-ranking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = safeSearchQuery(params.get("q"));
  const kind = safeSearchKind(params.get("kind"));
  const rawPage = Number(params.get("page") ?? "1");
  const page = Number.isInteger(rawPage) ? Math.max(1, Math.min(rawPage, 100)) : 1;
  if (query.length < 2) {
    return Response.json(
      { query, kind, page, catalog: [], catalogHasMore: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const result = await searchLibrary({ query, kind, page });
    return Response.json(result, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("PinFlix provider search failed", error);
    return Response.json({ error: "Search is temporarily unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
