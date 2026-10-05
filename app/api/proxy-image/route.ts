import { NextRequest, NextResponse } from "next/server";
import {
  fetchCineplexOrigin,
  isAllowedCineplexUrl,
} from "@/src/lib/cineplex-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");

  if (!rawUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return new NextResponse("Invalid image URL", { status: 400 });
  }

  if (!isAllowedCineplexUrl(url) || url.hostname.toLowerCase() === "vod.cineplexbd.net") {
    return new NextResponse("Image host is not allowed", { status: 403 });
  }

  try {
    const response = await fetchCineplexOrigin(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: "http://cineplexbd.net/",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok || !response.body) {
      return new NextResponse("Image unavailable", { status: response.status || 502 });
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("CineplexBD image proxy error:", error);
    return new NextResponse("Image unavailable", { status: 502 });
  }
}
