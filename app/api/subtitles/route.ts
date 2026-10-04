export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOST_SUFFIXES = [
  ".cloudfront.net",
  ".aoneroom.com",
  ".aoneroom.co",
];

function allowedSubtitleUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;

    const hostname = url.hostname.toLowerCase();
    if (!ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function srtToVtt(value: string) {
  const normalized = value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(
      /(\d{2}:\d{2}:\d{2}),(\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}),(\d{3})/g,
      "$1.$2 --> $3.$4",
    );

  return normalized.startsWith("WEBVTT")
    ? normalized
    : `WEBVTT\n\n${normalized}`;
}

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("url")?.trim() ?? "";
  const upstream = allowedSubtitleUrl(source);

  if (!upstream) {
    return Response.json({ error: "Unsupported subtitle source" }, { status: 400 });
  }

  try {
    const response = await fetch(upstream, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      headers: {
        Accept: "text/vtt,text/plain,application/x-subrip,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: `Subtitle upstream returned HTTP ${response.status}` },
        { status: 502 },
      );
    }

    const text = await response.text();
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const isVtt =
      contentType.includes("text/vtt") ||
      upstream.pathname.toLowerCase().endsWith(".vtt");

    return new Response(isVtt ? text : srtToVtt(text), {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Subtitle request failed",
      },
      { status: 502 },
    );
  }
}
