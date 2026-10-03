const ORIGIN_HOST = "cineplexbd.net";
const ORIGIN_IP = "103.136.200.66";

function normalizeOriginPath(path) {
  let normalized = path.replace(/\/{2,}/g, "/");
  normalized = normalized.replace(/^\/(?:uploads\/){2,}/i, "/uploads/");
  return normalized;
}

async function fetchOrigin(path, request) {
  const primary = new URL(normalizeOriginPath(path), "http://cineplexbd.net");
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

    path = normalizeOriginPath(path);

    try {
      const cache = caches.default;
      const cacheKey = new Request(new URL(path + incoming.search, "https://pinflix-origin-cache.invalid").toString());
      if (request.method === "GET") {
        const cached = await cache.match(cacheKey);
        if (cached) {
          const headers = new Headers(cached.headers);
          headers.set("X-PinFlix-Origin-Cache", "HIT");
          return new Response(cached.body, { status: cached.status, headers });
        }
      }

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
      headers.set("X-PinFlix-Normalized-Path", path);

      const outgoing = new Response(request.method === "HEAD" ? null : upstream.body, {
        status: upstream.status,
        headers,
      });
      if (request.method === "GET" && upstream.ok) {
        try { await cache.put(cacheKey, outgoing.clone()); } catch {}
      }
      return outgoing;
    } catch (error) {
      return Response.json({
        error: "Origin image unavailable",
        detail: error instanceof Error ? error.message : "upstream error",
      }, { status: 504, headers: { ...cors, "Cache-Control": "no-store" } });
    }
  },
};
