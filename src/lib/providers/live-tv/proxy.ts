import { assertPublicNetworkUrl, liveProviderHeaders, resolveLiveProviderChannel } from "./index";

function isManifestUrl(url: URL) {
  return /\.(?:m3u8|m3u)(?:$|[?#])/i.test(url.pathname + url.search);
}

function isManifestContentType(value: string) {
  const lower = value.toLowerCase();
  return lower.includes("mpegurl") || lower.includes("m3u8") || lower.includes("x-mpegurl");
}

function proxyResourceUrl(channelId: string, upstreamUrl: string) {
  return `/api/live/proxy?channelId=${encodeURIComponent(channelId)}&resource=${encodeURIComponent(upstreamUrl)}`;
}

function rewriteManifest(manifest: string, manifestUrl: string, channelId: string) {
  return manifest.split(/\r?\n/).map((line) => {
    if (!line) return line;

    if (line.startsWith("#")) {
      return line.replace(/(URI\s*=\s*)(["']?)([^",\s]+)\2/gi, (_match, prefix, quote, target) => {
        const resolved = new URL(target, manifestUrl).toString();
        return `${prefix}${quote}${proxyResourceUrl(channelId, resolved)}${quote}`;
      });
    }

    const resolved = new URL(line.trim(), manifestUrl).toString();
    return proxyResourceUrl(channelId, resolved);
  }).join("\n");
}

function buildHeaders(request: Request, providerHeaders: Record<string, string>, omitRange: boolean) {
  const headers: Record<string, string> = {
    ...providerHeaders,
    Accept: request.headers.get("accept") ?? "application/vnd.apple.mpegurl,application/x-mpegURL,video/mp2t,*/*",
  };

  const language = request.headers.get("accept-language");
  if (language) headers["Accept-Language"] = language;

  if (!omitRange) {
    const range = request.headers.get("range");
    if (range) headers.Range = range;
  }

  return headers;
}

async function fetchSameOrigin(
  request: Request,
  target: URL,
  rootOrigin: string,
  providerHeaders: Record<string, string>,
) {
  let current = target;

  for (let redirects = 0; redirects <= 5; redirects += 1) {
    await assertPublicNetworkUrl(current.toString());
    if (current.origin !== rootOrigin) {
      throw new Error("Live stream resource left its trusted stream origin.");
    }

    const manifestPath = isManifestUrl(current);
    const response = await fetch(current, {
      headers: buildHeaders(request, providerHeaders, manifestPath),
      cache: "no-store",
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Live stream redirect is missing Location.");
      current = new URL(location, current);
      continue;
    }

    return { response, finalUrl: current, manifestPath };
  }

  throw new Error("Too many live stream redirects.");
}

export async function proxyLiveChannel(request: Request, channelId: string, resource?: string | null) {
  const resolved = await resolveLiveProviderChannel(channelId);
  if (!resolved) {
    return Response.json({ error: "Live channel not found." }, { status: 404 });
  }

  if (resolved.networkScope === "local") {
    return Response.json({
      code: "LOCAL_NETWORK_ONLY",
      error: "This channel is only available from a compatible local/BDIX network.",
    }, { status: 409 });
  }

  await assertPublicNetworkUrl(resolved.upstreamUrl);
  const root = new URL(resolved.upstreamUrl);
  const target = resource ? new URL(resource) : root;

  if (target.origin !== root.origin) {
    return Response.json({ error: "Untrusted live stream resource origin." }, { status: 403 });
  }

  const providerHeaders = liveProviderHeaders(resolved.provider);
  const { response: upstream, finalUrl, manifestPath } = await fetchSameOrigin(
    request,
    target,
    root.origin,
    providerHeaders,
  );

  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: `Upstream returned HTTP ${upstream.status}.` }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  if (manifestPath || isManifestContentType(contentType)) {
    const manifest = await upstream.text();
    return new Response(rewriteManifest(manifest, finalUrl.toString(), channelId), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store",
      },
    });
  }

  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const name of ["content-type", "content-range", "accept-ranges", "content-length"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
