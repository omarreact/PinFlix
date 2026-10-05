import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const headers = new Headers();
    const range = req.headers.get("range");
    if (range) {
      headers.set("Range", range);
    }
    
    headers.set("Referer", "http://cineplexbd.net/");
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

    const response = await fetch(url, { headers });

    // Handle M3U8 playlist rewriting
    if (url.includes(".m3u8")) {
      const text = await response.text();
      const rewritten = text.split("\n").map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          // Resolve absolute URL for the segment
          const absoluteUrl = trimmed.startsWith("http") ? trimmed : new URL(trimmed, url).toString();
          // Route it back through our proxy
          return `/api/proxy-video?url=${encodeURIComponent(absoluteUrl)}`;
        }
        return trimmed;
      }).join("\n");

      return new Response(rewritten, {
        status: response.status,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

    // Stream native video/mp4 or TS segments
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "video/mp4",
        "Content-Length": response.headers.get("Content-Length") || "",
        "Content-Range": response.headers.get("Content-Range") || "",
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Video proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(`Proxy Error: ${message}`, { status: 500 });
  }
}
