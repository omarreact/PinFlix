import { searchTmdb } from "@/src/lib/tmdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function positivePage(value: string | null) {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page > 0 ? Math.min(page, 500) : 1;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const page = positivePage(url.searchParams.get("page"));

  if (!query) {
    return Response.json({
      page: 1,
      results: [],
      totalPages: 0,
      totalResults: 0,
    });
  }

  try {
    const data = await searchTmdb(query, page);
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("TMDB search failed", error);
    return Response.json({ error: "TMDB search unavailable" }, { status: 502 });
  }
}
