const ORIGIN_HOST = "cineplexbd.net";
const ORIGIN_IP = "103.136.200.66";

async function fetchOrigin(path, request) {
  const primary = new URL(path, "http://cineplexbd.net");
  const headers = new Headers({
    "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0",
    "Accept": request.headers.get("Accept") || "image/*,*/*",
    "Referer": "http://cineplexbd.net/",
  });

  try {
    const response = await fetch(primary.toString(), {
      method: request.method,
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    if (response.status < 500 && response.status !== 403) return { response, transport: "hostname" };
  } catch {}

  const fallback = new URL(primary.toString());
  fallback.hostname = ORIGIN_IP;
  headers.set("Host", ORIGIN_HOST);
  const response = await fetch(fallback.toString(), {
    method: request.method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(12000),
  });
  return { response, transport: "ipv4-fallback" };
}

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405 });

    let path = incoming.pathname;
    if (path.startsWith("/cineplex-origin")) {
      path = path.slice("/cineplex-origin".length) || "/";
    }

    try {
      const { response: upstream, transport } = await fetchOrigin(path + incoming.search, request);
      const headers = new Headers(cors);
      for (const name of ["content-type", "content-length", "etag", "last-modified", "location"]) {
        const value = upstream.headers.get(name);
        if (value) headers.set(name, value);
      }
      headers.set("Cache-Control", upstream.ok ? "public, max-age=3600, s-maxage=86400" : "no-store");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("X-Robots-Tag", "noindex");
      headers.set("X-PinFlix-Origin-Transport", transport);
      return new Response(request.method === "HEAD" ? null : upstream.body, {
        status: upstream.status,
        headers,
      });
    } catch (error) {
      return Response.json({
        error: "Origin image unavailable",
        detail: error instanceof Error ? error.message : "upstream error",
      }, { status: 504, headers: { ...cors, "Cache-Control": "no-store" } });
    }
  },
};
