import { catalogProvider } from "@/src/lib/providers/catalog";

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
    const results = await catalogProvider.search(query, page);
    return Response.json(
      {
        page,
        results,
        totalPages: results.length ? page + 1 : page,
        totalResults: results.length,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("Provider search failed", error);
    return Response.json({ error: "Search unavailable" }, { status: 502 });
  }
}
