import { connect } from "cloudflare:sockets";

const CATALOG_HOST = "cineplexbd.net";
const ORIGIN_IPS = {
  "cineplexbd.net": "103.136.200.66",
  "www.cineplexbd.net": "103.136.200.66",
  "vod.cineplexbd.net": "103.136.200.124",
};

const CATALOG_TIMEOUT_MS = 5000;
const MEDIA_TIMEOUT_MS = 20000;
const CATALOG_FRESH_TTL_SECONDS = 120;
const CATALOG_STALE_TTL_SECONDS = 86_400;

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

    if (options.catalog && (response.status === 403 || response.status >= 500) && target.protocol === "http:") {
      try {
        const socketResponse = await socketHttpFetch(target, request, Math.min(timeoutMs, 5000));
        attempts.push({ transport: "tcp-socket", status: socketResponse.status, ip: fallbackIp });
        if (socketResponse.status !== 403 && socketResponse.status < 500) {
          return { response: socketResponse, transport: "tcp-socket", attempts, finalUrl: target };
        }
      } catch (socketError) {
        attempts.push({
          transport: "tcp-socket",
          ip: fallbackIp,
          error: socketError instanceof Error ? socketError.message : "socket error",
        });
      }
    }

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


function findHeaderBoundary(bytes) {
  for (let i = 0; i <= bytes.length - 4; i += 1) {
    if (bytes[i] === 13 && bytes[i + 1] === 10 && bytes[i + 2] === 13 && bytes[i + 3] === 10) return i;
  }
  return -1;
}

function concatBytes(chunks, total) {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function decodeChunkedBody(bytes) {
  const decoder = new TextDecoder();
  const chunks = [];
  let total = 0;
  let offset = 0;

  while (offset < bytes.length) {
    let lineEnd = -1;
    for (let i = offset; i < bytes.length - 1; i += 1) {
      if (bytes[i] === 13 && bytes[i + 1] === 10) {
        lineEnd = i;
        break;
      }
    }
    if (lineEnd < 0) throw new Error("Malformed chunked response.");

    const sizeLine = decoder.decode(bytes.slice(offset, lineEnd)).split(";", 1)[0].trim();
    const size = Number.parseInt(sizeLine, 16);
    if (!Number.isFinite(size)) throw new Error("Invalid chunk size.");
    offset = lineEnd + 2;
    if (size === 0) break;
    if (offset + size > bytes.length) throw new Error("Incomplete chunked response.");

    const chunk = bytes.slice(offset, offset + size);
    chunks.push(chunk);
    total += chunk.byteLength;
    offset += size + 2;
  }

  return concatBytes(chunks, total);
}

async function socketHttpFetch(target, request, timeoutMs) {
  const hostname = target.hostname.toLowerCase();
  const ip = ORIGIN_IPS[hostname];
  if (!ip || target.protocol !== "http:") throw new Error("TCP fallback target is not supported.");

  const socket = connect({ hostname: ip, port: Number(target.port || "80") }, { allowHalfOpen: true });
  const writer = socket.writable.getWriter();
  const headers = baseHeaders(request, target, { catalog: true });
  const requestLines = [
    `${request.method === "HEAD" ? "HEAD" : "GET"} ${target.pathname}${target.search} HTTP/1.1`,
    `Host: ${target.host}`,
  ];
  for (const [name, value] of headers) {
    if (name.toLowerCase() !== "host") requestLines.push(`${name}: ${value}`);
  }
  requestLines.push("Connection: close", "", "");

  const timer = setTimeout(() => {
    try { socket.close(); } catch {}
  }, timeoutMs);

  try {
    await writer.write(new TextEncoder().encode(requestLines.join("\r\n")));
    await writer.close();

    const reader = socket.readable.getReader();
    const chunks = [];
    let total = 0;
    const maxBytes = 4 * 1024 * 1024;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      chunks.push(value);
      total += value.byteLength;
      if (total > maxBytes) throw new Error("Catalog TCP response exceeded 4 MiB.");
    }

    const raw = concatBytes(chunks, total);
    const boundary = findHeaderBoundary(raw);
    if (boundary < 0) throw new Error("TCP fallback returned no HTTP headers.");

    const headerText = new TextDecoder().decode(raw.slice(0, boundary));
    const lines = headerText.split("\r\n");
    const statusMatch = lines.shift()?.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/i);
    if (!statusMatch) throw new Error("TCP fallback returned an invalid HTTP status line.");

    const responseHeaders = new Headers();
    for (const line of lines) {
      const colon = line.indexOf(":");
      if (colon <= 0) continue;
      responseHeaders.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
    }

    let body = raw.slice(boundary + 4);
    if ((responseHeaders.get("transfer-encoding") || "").toLowerCase().includes("chunked")) {
      body = decodeChunkedBody(body);
      responseHeaders.delete("transfer-encoding");
      responseHeaders.set("content-length", String(body.byteLength));
    }

    return new Response(request.method === "HEAD" ? null : body, {
      status: Number(statusMatch[1]),
      headers: responseHeaders,
    });
  } finally {
    clearTimeout(timer);
    try { socket.close(); } catch {}
  }
}

async function fetchCatalogRace(target, request, timeoutMs) {
  const attempts = [];
  const badResponses = [];

  const run = async (transport, task) => {
    try {
      const response = await task();
      attempts.push({ transport, status: response.status });
      if (response.status === 403 || response.status >= 500) {
        badResponses.push({ transport, response });
        throw new Error(`${transport} returned HTTP ${response.status}`);
      }
      return { response, transport, attempts };
    } catch (error) {
      if (!attempts.some((item) => item.transport === transport)) {
        attempts.push({
          transport,
          error: error instanceof Error ? error.message : "network error",
        });
      }
      throw error;
    }
  };

  const fallbackIp = ORIGIN_IPS[target.hostname.toLowerCase()];
  const racers = [
    run("hostname", () => fetchCandidate(target, request, timeoutMs, { catalog: true })),
  ];

  if (fallbackIp) {
    racers.push(run("ipv4-fallback", async () => {
      const fallback = new URL(target.toString());
      fallback.hostname = fallbackIp;
      const headers = baseHeaders(request, target, { catalog: true });
      headers.set("Host", target.host);
      return fetch(fallback.toString(), {
        method: request.method === "HEAD" ? "HEAD" : "GET",
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
    }));

  }

  try {
    return await Promise.any(racers);
  } catch {
    if (badResponses.length) {
      const preferred = badResponses.find((item) => item.response.status !== 403) || badResponses[0];
      return { response: preferred.response, transport: preferred.transport, attempts };
    }
    const error = new Error("Catalog origin unavailable across all transports");
    error.attempts = attempts;
    throw error;
  }
}

function catalogCacheKeys(incoming) {
  const encoded = encodeURIComponent(incoming.pathname + incoming.search);
  return {
    fresh: new Request(`https://pinflix-cache.invalid/catalog/fresh/${encoded}`),
    stale: new Request(`https://pinflix-cache.invalid/catalog/stale/${encoded}`),
  };
}

async function cachedCatalogResponse(request, incoming, cors) {
  if (request.method !== "GET") return null;
  const hit = await caches.default.match(catalogCacheKeys(incoming).fresh);
  if (!hit) return null;
  const headers = new Headers(hit.headers);
  for (const [key, value] of Object.entries(cors)) headers.set(key, value);
  headers.set("X-PinFlix-Catalog-Cache", "HIT");
  return new Response(hit.body, { status: hit.status, headers });
}

async function staleCatalogResponse(request, incoming, cors) {
  if (request.method !== "GET") return null;
  const hit = await caches.default.match(catalogCacheKeys(incoming).stale);
  if (!hit) return null;
  const headers = new Headers(hit.headers);
  for (const [key, value] of Object.entries(cors)) headers.set(key, value);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-PinFlix-Catalog-Cache", "STALE");
  headers.set("Warning", '110 - "Response is stale"');
  return new Response(hit.body, { status: hit.status, headers });
}

async function storeCatalogResponse(incoming, response) {
  if (!response.ok) return;
  const keys = catalogCacheKeys(incoming);

  const freshHeaders = new Headers(response.headers);
  freshHeaders.set("Cache-Control", `public, max-age=${CATALOG_FRESH_TTL_SECONDS}`);
  const staleHeaders = new Headers(response.headers);
  staleHeaders.set("Cache-Control", `public, max-age=${CATALOG_STALE_TTL_SECONDS}`);

  try {
    await Promise.all([
      caches.default.put(keys.fresh, new Response(response.clone().body, { status: response.status, headers: freshHeaders })),
      caches.default.put(keys.stale, new Response(response.clone().body, { status: response.status, headers: staleHeaders })),
    ]);
  } catch {}
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
      return Response.json({
        ok: true,
        service: "pinflix-media-edge",
        catalogRelay: true,
        upstream: {
          reachable: null,
          status: null,
          outcome: "unchecked",
          note: "Platform health is intentionally independent of Cineplex upstream availability.",
        },
      }, { headers: { ...cors, "Cache-Control": "no-store" } });
    }

    const catalog = catalogTarget(incoming);
    if (catalog) {
      const fresh = await cachedCatalogResponse(request, incoming, cors);
      if (fresh) return fresh;

      try {
        const { response, transport, attempts } = await fetchCatalogRace(
          catalog,
          request,
          Math.min(CATALOG_TIMEOUT_MS, 2500),
        );

        if (response.status === 403 || response.status >= 500) {
          const stale = await staleCatalogResponse(request, incoming, cors);
          if (stale) return stale;
        }

        const headers = copyHeaders(response, cors);
        headers.set("Cache-Control", response.ok ? "public, max-age=120" : "private, no-store");
        headers.set("X-PinFlix-Origin-Transport", transport);
        headers.set("X-PinFlix-Origin-Attempts", attempts.map((item) => item.transport).join(","));

        const outgoing = new Response(request.method === "HEAD" ? null : response.body, {
          status: response.status,
          headers,
        });
        if (request.method === "GET" && outgoing.ok) {
          await storeCatalogResponse(incoming, outgoing.clone());
        }
        return outgoing;
      } catch (error) {
        const stale = await staleCatalogResponse(request, incoming, cors);
        if (stale) return stale;

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
