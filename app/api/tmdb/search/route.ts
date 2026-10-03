import { NextRequest, NextResponse } from "next/server";
import { isTMDBConfigured } from "@/src/lib/tmdb/client";
import { searchTMDB } from "@/src/lib/tmdb/queries";

export async function GET(request: NextRequest) {
  if (!isTMDBConfigured()) {
    return NextResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0, configured: false });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const requestedPage = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  if (query.length < 2) {
    return NextResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0, configured: true });
  }

  try {
    const data = await searchTMDB(query, page);
    return NextResponse.json({ ...data, configured: true });
  } catch (error) {
    console.error("TMDB search failed", error);
    return NextResponse.json({ error: "Unable to search TMDB right now.", configured: true }, { status: 502 });
  }
}
