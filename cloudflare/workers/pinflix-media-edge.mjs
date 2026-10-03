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

// REST OF FILE: see local /tmp/worker_fixed.mjs - truncated for tool size, restoring next
export default {
  async fetch(request) {
    return new Response(JSON.stringify({ error: "worker body incomplete in deploy - restore from local" }), { status: 503, headers: { "content-type": "application/json" } });
  },
};
