const ORIGIN = "http://cineplexbd.net";
const ALLOWED_HOSTS = new Set([
  "cineplexbd.net",
  "www.cineplexbd.net",
  "cds3.cineplexbd.net",
  "vod.cineplexbd.net",
]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

function isBlockedPath(pathname) {
  return pathname.toLowerCase().startsWith("/admin");
}

function isAllowedTarget(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(url.protocol)) return null;
  if (url.username || url.password || url.hash) return null;

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) return null;
  if (isBlockedPath(url.pathname)) return null;

  if (host === "vod.cineplexbd.net") {
    if (url.protocol !== "http:" || (url.port && url.port !== "8081")) return null;
  } else if (url.port) {
    return null;
  }

  const path = url.pathname.toLowerCase();
  const cataloguePath =
    path === "/" ||
    /^\/(?:index|category|tcategory|tvs|tvs_more|search|search_ajax|view|player|watch|tview|series|tv_series)\.php$/.test(path);
  const assetPath =
    path.startsWith("/uploads/") ||
    path.startsWith("/hls/") ||
    path.startsWith("/v/") ||
    path.startsWith("/movies/") ||
    path.startsWith("/tv-series/") ||
    /\.(?:m3u8|ts|m4s|mp4|jpg|jpeg|png|webp|avif)(?:$|\/)/i.test(path);

  if (!cataloguePath && !assetPath) return null;
  return url;
}

function requestHeaders(request, target) {
  const headers = new Headers();
  headers.set("accept", request.headers.get("accept") || "*/*");
  headers.set("accept-language", request.headers.get("accept-language") || "en-US,en;q=0.9");
  headers.set("user-agent", request.headers.get("user-agent") || "Mozilla/5.0");
  headers.set("referer", ORIGIN + "/");
  const range = request.headers.get("range");
  if (range) headers.set("range", range);
  if (target.pathname.endsWith(".m3u8")) {
    headers.set("accept", "application/vnd.apple.mpegurl,application/x-mpegURL,*/*");
  }
  return headers;
}

async function fetchUpstream(target, request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    let current = target;
    for (let i = 0; i < 3; i++) {
      const response = await fetch(current.toString(), {
        method: request.method === "HEAD" ? "HEAD" : "GET",
        headers: requestHeaders(request, current),
        redirect: "manual",
        signal: controller.signal,
        cf: { cacheTtl: 0, cacheEverything: false },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return response;
        const next = isAllowedTarget(new URL(location, current).toString());
        if (!next) return new Response("Blocked provider redirect", { status: 403 });
        await response.body?.cancel();
        current = next;
        continue;
      }

      const headers = new Headers();
      for (const name of [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "last-modified",
        "etag",
      ]) {
        const value = response.headers.get(name);
        if (value) headers.set(name, value);
      }
      headers.set("cache-control", "no-store");
      headers.set("access-control-allow-origin", "*");
      headers.set("x-content-type-options", "nosniff");
      headers.set("x-pinflix-edge", "cineplex");

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    }
    return new Response("Too many provider redirects", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

addEventListener("fetch", (event) => {
  event.respondWith((async () => {
    const request = event.request;
    const incoming = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,HEAD,OPTIONS",
          "access-control-allow-headers": "Range,Accept,Content-Type",
        },
      });
    }

    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response("Method not allowed", { status: 405 });
    }

    if (incoming.pathname === "/health") {
      const target = isAllowedTarget(ORIGIN + "/");
      if (!target) return json({ ok: false, error: "invalid_origin" }, 500);
      const started = Date.now();
      try {
        const response = await fetchUpstream(target, new Request(request.url, { method: "HEAD", headers: request.headers }));
        return json({
          ok: response.status >= 200 && response.status < 500,
          service: "pinflix-media-edge",
          upstreamStatus: response.status,
          latencyMs: Date.now() - started,
        }, response.status >= 500 ? 502 : 200);
      } catch (error) {
        return json({
          ok: false,
          service: "pinflix-media-edge",
          error: error instanceof Error ? error.name : "upstream_error",
          latencyMs: Date.now() - started,
        }, 502);
      }
    }

    let target = null;
    if (incoming.pathname.startsWith("/catalog")) {
      const suffix = incoming.pathname.slice("/catalog".length) || "/";
      target = isAllowedTarget(ORIGIN + suffix + incoming.search);
    } else {
      const raw = incoming.searchParams.get("url");
      if (raw) target = isAllowedTarget(raw);
    }

    if (!target) return new Response("Provider URL is not allowed", { status: 403 });

    try {
      return await fetchUpstream(target, request);
    } catch (error) {
      return json({
        ok: false,
        error: error instanceof Error ? error.name : "upstream_error",
      }, 502);
    }
  })());
});
