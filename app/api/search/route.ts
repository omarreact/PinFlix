import { catalogProvider } from "@/src/lib/providers/catalog";
import { rankSearch, safeSearchQuery } from "@/src/lib/search-ranking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = safeSearchQuery(new URL(request.url).searchParams.get("q"));

  if (!query) {
    return Response.json(
      { entertainment: [] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }

  try {
    const entertainment = rankSearch(
      await catalogProvider.search(query),
      query,
      "all",
    );
    return Response.json(
      { entertainment },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    console.error("Provider title search is unavailable");
    return Response.json(
      { entertainment: [], error: "Search is temporarily unavailable" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
