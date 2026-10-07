import { getTmdbDetails } from "@/src/lib/tmdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const id = Number(url.searchParams.get("id"));

  if ((type !== "movie" && type !== "tv") || !Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid TMDB title" }, { status: 400 });
  }

  try {
    const details = await getTmdbDetails(type, id);
    return Response.json(details, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch (error) {
    console.error("TMDB details failed", error);
    return Response.json({ error: "TMDB details unavailable" }, { status: 502 });
  }
}
