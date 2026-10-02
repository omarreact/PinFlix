const CATALOG_HOST = "cineplexbd.net";
const ORIGIN_IPS = {
  "cineplexbd.net": "103.136.200.66",
  "www.cineplexbd.net": "103.136.200.66",
  "vod.cineplexbd.net": "103.136.200.124",
};

const CATALOG_TIMEOUT_MS = 5000;
const MEDIA_TIMEOUT_MS = 20000;

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = new Set([
    "https://pinflix.pincodeit.com",
    "https://pinflix-staging.pincodeit.com",
    "https://pinflix.farukkhanone.workers.dev",
  ]);
  return {
    "Access-Control-Allow-Origin": allowed.has(origin) ? origin : "https://pinflix.pincodeit.com",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Range,Content-Type",
    "Access-Control-Expose-Headers": "Content-Length,Content-Range,Accept-Ranges,Content-Type",
    "Vary": "Origin",
  };
}

function catalogTarget(incoming) {
  if (!incoming.pathname.startsWith("/catalog")) return null;
  const suffix = incoming.pathname.slice("/catalog".length) || "/";
  return new URL(suffix + incoming.search, "http://cineplexbd.net");
}

function baseHeaders(request, target, { catalog = false } = {}) {
  const headers = new Headers();
  headers.set(
    "User-Agent",
    request.headers.get("User-Agent") ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  );
  headers.set("Accept-Language", request.headers.get("Accept-Language") || "en-US,en;q=0.9");
  headers.set("Accept", request.headers.get("Accept") || (catalog
    ? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    : "*/*"));
  headers.set("Referer", "http://cineplexbd.net/");

  const range = request.headers.get("Range");
  if (range) headers.set("Range", range);

  if (target.hostname !== CATALOG_HOST) {
    headers.set("Host", target.host);
  }
  return headers;
}

async function fetchCandidate(url, request, timeoutMs, options = {}) {
  const headers = baseHeaders(request, url, options);
  return fetch(url.toString(), {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function fetchWithOriginFallback(target, request, timeoutMs, options = {}) {
  const attempts = [];

  try {
    const response = await fetchCandidate(target, request, timeoutMs, options);
    attempts.push({ transport: "hostname", status: response.status });
    if (response.status < 500 && response.status !== 403) {
      return { response, transport: "hostname", attempts, finalUrl: target };
    }
  } catch (error) {
    attempts.push({
      transport: "hostname",
      error: error instanceof Error ? error.message : "network error",
    });
  }

  const fallbackIp = ORIGIN_IPS[target.hostname.toLowerCase()];
  if (!fallbackIp) {
    const last = attempts.at(-1);
    throw new Error(last?.error || `Origin unavailable after HTTP ${last?.status ?? "error"}`);
  }

  const fallback = new URL(target.toString());
  const originalHost = target.host;
  fallback.hostname = fallbackIp;

  const headers = baseHeaders(request, target, options);
  headers.set("Host", originalHost);

  try {
    const response = await fetch(fallback.toString(), {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    attempts.push({ transport: "ipv4-fallback", status: response.status, ip: fallbackIp });
    return { response, transport: "ipv4-fallback", attempts, finalUrl: target };
  } catch (error) {
    attempts.push({
      transport: "ipv4-fallback",
      ip: fallbackIp,
      error: error instanceof Error ? error.message : "network error",
    });
    const err = new Error("Origin unavailable via hostname and IPv4 fallback");
    err.attempts = attempts;
    throw err;
  }
}

function copyHeaders(upstream, cors) {
  const out = new Headers();
  for (const name of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
    "cache-control",
    "location",
  ]) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  for (const [key, value] of Object.entries(cors)) out.set(key, value);
  out.set("X-Content-Type-Options", "nosniff");
  out.set("X-Robots-Tag", "noindex");
  return out;
}

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const cors = corsHeaders(request);
    const allowedHosts = new Set(Object.keys(ORIGIN_IPS));

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    if (incoming.pathname === "/health") {
      const target = new URL("http://cineplexbd.net/");
      const startedAt = Date.now();
      try {
        const { response, transport, attempts } = await fetchWithOriginFallback(
          target,
          new Request(request.url, { method: "GET", headers: request.headers }),
          3500,
          { catalog: true },
        );
        return Response.json({
          ok: true,
          service: "pinflix-media-edge",
          catalogRelay: true,
          upstream: {
            reachable: response.status >= 200 && response.status < 500,
            status: response.status,
            latencyMs: Date.now() - startedAt,
            outcome: response.status >= 200 && response.status < 400 ? "reachable" : "http_error",
            transport,
            attempts,
          },
        }, { headers: { ...cors, "Cache-Control": "no-store" } });
      } catch (error) {
        return Response.json({
          ok: true,
          service: "pinflix-media-edge",
          catalogRelay: true,
          upstream: {
            reachable: false,
            status: null,
            latencyMs: Date.now() - startedAt,
            outcome: "network_error",
            attempts: error?.attempts || [],
            detail: error instanceof Error ? error.message : "upstream error",
          },
        }, { headers: { ...cors, "Cache-Control": "no-store" } });
      }
    }

    const catalog = catalogTarget(incoming);
    if (catalog) {
      try {
        const { response, transport } = await fetchWithOriginFallback(
          catalog,
          request,
          CATALOG_TIMEOUT_MS,
          { catalog: true },
        );
        const headers = copyHeaders(response, cors);
        headers.set("Cache-Control", "private, no-store");
        headers.set("X-PinFlix-Origin-Transport", transport);
        return new Response(request.method === "HEAD" ? null : response.body, {
          status: response.status,
          headers,
        });
      } catch (error) {
        return Response.json({
          error: "Catalog upstream unavailable",
          detail: error instanceof Error ? error.message : "upstream error",
          attempts: error?.attempts || [],
          target: catalog.toString(),
        }, { status: 504, headers: { ...cors, "Cache-Control": "no-store" } });
      }
    }

    const raw = incoming.searchParams.get("url");
    if (!raw) return new Response("Missing url", { status: 400, headers: cors });

    let target;
    try {
      target = new URL(raw);
    } catch {
      return new Response("Invalid url", { status: 400, headers: cors });
    }

    if (!["http:", "https:"].includes(target.protocol) || !allowedHosts.has(target.hostname.toLowerCase())) {
      return new Response("Target not allowed", { status: 403, headers: cors });
    }

    try {
      const { response: upstream, transport } = await fetchWithOriginFallback(
        target,
        request,
        MEDIA_TIMEOUT_MS,
      );
      const outHeaders = copyHeaders(upstream, cors);
      outHeaders.set("X-PinFlix-Origin-Transport", transport);

      const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
      const isManifest =
        target.pathname.toLowerCase().endsWith(".m3u8") ||
        contentType.includes("mpegurl");

      if (!isManifest || request.method === "HEAD") {
        return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
      }

      const body = await upstream.text();
      const makeProxy = (value) => {
        try {
          const absolute = new URL(value, target).toString();
          const parsed = new URL(absolute);
          if (!allowedHosts.has(parsed.hostname.toLowerCase())) return absolute;
          const next = new URL(incoming.origin + "/");
          next.searchParams.set("url", absolute);
          return next.toString();
        } catch {
          return value;
        }
      };

      const rewritten = body
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => {
          if (!line.trim()) return line;
          const attrs = line.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${makeProxy(uri)}"`);
          if (attrs.trimStart().startsWith("#")) return attrs;
          return makeProxy(attrs.trim());
        })
        .join("\n");

      outHeaders.delete("content-length");
      outHeaders.set("content-type", "application/vnd.apple.mpegurl");
      outHeaders.set("cache-control", "private, no-store");
      return new Response(rewritten, { status: upstream.status, headers: outHeaders });
    } catch (error) {
      return Response.json({
        error: "Upstream unavailable",
        detail: error instanceof Error ? error.message : "upstream error",
        attempts: error?.attempts || [],
      }, { status: 504, headers: { ...cors, "Cache-Control": "no-store" } });
    }
  },
};
