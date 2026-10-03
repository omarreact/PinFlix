const ALLOWED_PREFIXES = ["/_next/static/"];
const ALLOWED_FILES = new Set(["/vinext-client-entry-manifest.json"]);
const ASSET_ROOT = "/.cloudflare/output/v0/workers/default/assets";
const RAW_BASES = [
  "https://raw.githubusercontent.com/omarreact/PinFlix/cloudflare-built-output" + ASSET_ROOT,
  "https://cdn.jsdelivr.net/gh/omarreact/PinFlix@cloudflare-built-output" + ASSET_ROOT,
];
const FLAT_INDEX_URL = "https://data.jsdelivr.com/v1/package/gh/omarreact/PinFlix@cloudflare-built-output/flat";
const INDEX_CACHE_KEY = new Request("https://pinflix-assets.invalid/build-index-v2");

function allowed(pathname) {
  return ALLOWED_FILES.has(pathname) || ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function contentType(pathname) {
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".js") || pathname.endsWith(".mjs")) return "application/javascript; charset=utf-8";
  if (pathname.endsWith(".json")) return "application/json; charset=utf-8";
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".woff2")) return "font/woff2";
  if (pathname.endsWith(".woff")) return "font/woff";
  return "application/octet-stream";
}

async function fetchAsset(pathname) {
  for (const base of RAW_BASES) {
    try {
      const response = await fetch(base + pathname, {
        headers: { "User-Agent": "PinFlix-Cloudflare-Assets", "Accept": "*/*" },
        redirect: "follow",
      });
      if (response.ok) return { response, source: new URL(base).hostname };
      if (response.status !== 404) return { response, source: new URL(base).hostname };
    } catch {}
  }
  return null;
}

function stableAssetIdentity(pathname) {
  const slash = pathname.lastIndexOf("/");
  const dir = slash >= 0 ? pathname.slice(0, slash + 1) : "/";
  const file = slash >= 0 ? pathname.slice(slash + 1) : pathname;
  const dot = file.lastIndexOf(".");
  if (dot <= 0) return null;
  const ext = file.slice(dot);
  const stem = file.slice(0, dot);
  const stripped = stem.replace(/-[A-Za-z0-9_-]{6,}$/, "");
  if (stripped === stem) return null;
  return { dir, prefix: stripped + "-", ext };
}

async function getBuildIndex() {
  const cache = caches.default;
  const hit = await cache.match(INDEX_CACHE_KEY);
  if (hit) {
    try { return await hit.json(); } catch {}
  }

  const response = await fetch(FLAT_INDEX_URL, {
    headers: { "User-Agent": "PinFlix-Cloudflare-Assets" },
  });
  if (!response.ok) return null;

  const data = await response.json();
  try {
    await cache.put(
      INDEX_CACHE_KEY,
      new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
      }),
    );
  } catch {}
  return data;
}

async function resolveCurrentPath(pathname) {
  const identity = stableAssetIdentity(pathname);
  if (!identity) return null;

  const index = await getBuildIndex();
  const files = Array.isArray(index?.files) ? index.files : [];
  const fullPrefix = ASSET_ROOT + identity.dir + identity.prefix;
  const candidates = files
    .map((item) => typeof item?.name === "string" ? item.name : "")
    .filter((name) => name.startsWith(fullPrefix) && name.endsWith(identity.ext))
    .sort();

  if (!candidates.length) return null;
  return candidates.at(-1).slice(ASSET_ROOT.length);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json(
        { ok: true, service: "pinflix-assets", dynamicHashResolution: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405 });
    if (!allowed(url.pathname)) return new Response("Not found", { status: 404 });

    const cache = caches.default;
    const requestKey = new Request("https://pinflix-assets.invalid" + url.pathname);

    if (request.method === "GET") {
      const hit = await cache.match(requestKey);
      if (hit) {
        const headers = new Headers(hit.headers);
        headers.set("X-PinFlix-Asset-Cache", "HIT");
        return new Response(hit.body, { status: hit.status, headers });
      }
    }

    let resolvedPath = url.pathname;
    let upstream = await fetchAsset(resolvedPath);

    if (!upstream?.response?.ok && upstream?.response?.status === 404) {
      const dynamicPath = await resolveCurrentPath(url.pathname);
      if (dynamicPath) {
        resolvedPath = dynamicPath;
        upstream = await fetchAsset(resolvedPath);
      }
    }

    if (!upstream?.response?.ok) {
      const status = upstream?.response?.status || 502;
      return new Response("Asset unavailable", {
        status,
        headers: {
          "Cache-Control": "no-store",
          "X-PinFlix-Asset-Upstream-Status": String(status),
          "X-PinFlix-Resolved-Path": resolvedPath,
        },
      });
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType(resolvedPath));
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("X-PinFlix-Asset-Source", upstream.source);
    if (resolvedPath !== url.pathname) headers.set("X-PinFlix-Asset-Alias", resolvedPath);

    const response = new Response(request.method === "HEAD" ? null : upstream.response.body, { status: 200, headers });
    if (request.method === "GET") {
      try { await cache.put(requestKey, response.clone()); } catch {}
    }
    return response;
  },
};
