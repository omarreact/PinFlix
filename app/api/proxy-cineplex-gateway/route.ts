import { resolveGatewayStreamUrl } from "@/src/lib/providers/cineplexbd/gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function proxyPath(value: string): string {
  return `/api/proxy-cineplex-gateway?path=${encodeURIComponent(value)}`;
}

function rewriteManifest(contents: string): string {
  return contents
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim()) return line;

      if (line.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_match, value: string) => {
          if (!resolveGatewayStreamUrl(value)) {
            throw new Error("Gateway manifest contains an unsupported URI");
          }
          return `URI="${proxyPath(value)}"`;
        });
      }

      const value = line.trim();
      if (!resolveGatewayStreamUrl(value)) {
        throw new Error("Gateway manifest contains an unsupported segment");
      }
      return proxyPath(value);
    })
    .join("\n");
}

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const path = incoming.searchParams.get("path") ?? "";
  const upstream = resolveGatewayStreamUrl(path);

  if (!upstream) {
    return Response.json(
      { error: "Invalid Cineplex gateway stream path." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const headers = new Headers();
  headers.set("Accept", request.headers.get("accept") || "*/*");
  headers.set("User-Agent", "PinFlix/1.0 Cineplex gateway stream relay");
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  let response: Response;
  try {
    response = await fetch(upstream, {
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
  } catch {
    return Response.json(
      { error: "Cineplex gateway stream is unreachable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel();
    return Response.json(
      { error: "Cineplex gateway returned an unsupported redirect." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!response.ok && response.status !== 206) {
    await response.body?.cancel();
    return Response.json(
      { error: "Cineplex gateway media source is unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const isHls =
    /mpegurl/i.test(contentType) ||
    /\.m3u8(?:$|[?&#])/i.test(upstream.searchParams.get("url") || "");

  if (isHls) {
    try {
      const contents = await response.text();
      if (!contents.trimStart().startsWith("#EXTM3U")) {
        return Response.json(
          { error: "Cineplex gateway returned an invalid HLS manifest." },
          { status: 502, headers: { "Cache-Control": "no-store" } },
        );
      }

      return new Response(rewriteManifest(contents), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return Response.json(
        { error: "Cineplex gateway HLS manifest could not be relayed safely." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  const output = new Headers();
  for (const name of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ]) {
    const value = response.headers.get(name);
    if (value) output.set(name, value);
  }
  output.set("Cache-Control", "no-store");
  output.set("Access-Control-Allow-Origin", "*");
  output.set("X-Content-Type-Options", "nosniff");

  return new Response(response.body, {
    status: response.status,
    headers: output,
  });
}
