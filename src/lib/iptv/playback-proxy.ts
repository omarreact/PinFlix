import { lookup } from "node:dns/promises";
import net from "node:net";

const allowedHosts = new Set(["test-streams.mux.dev", "vod.cineplexbd.net", "cineplexbd.net"]);
const hostPorts = new Map<string, Set<string>>([
  ["test-streams.mux.dev", new Set(["80", "443"])],
  ["vod.cineplexbd.net", new Set(["80", "443", "8081"])],
  ["cineplexbd.net", new Set(["80", "443"])],
]);

export function isPinflixProxyUrl(value: string) {
  if (!value) return false;
  const maybeUrl = value.trim();
  if (maybeUrl.includes("/api/playback/proxy") || maybeUrl.includes("/api/proxy")) return true;
  try {
    const parsed = new URL(maybeUrl, "http://localhost");
    return parsed.pathname === "/api/playback/proxy" || parsed.pathname === "/api/proxy";
  } catch {
    return false;
  }
}

export function toProxyUrl(value: string) {
  return `/api/playback/proxy?url=${encodeURIComponent(value)}`;
}

export function resolveManifestUri(manifestUrl: string, uri: string) {
  if (!uri) return manifestUrl;
  const current = uri.trim();
  if (isPinflixProxyUrl(current)) return current;
  try {
    return new URL(current, manifestUrl).toString();
  } catch {
    return current;
  }
}

export function rewriteManifestText(manifest: string, manifestUrl: string) {
  return manifest.split(/\r?\n/).map((line) => {
    if (!line) return line;
    if (line.startsWith("#")) {
      return line.replace(/(URI\s*=\s*)(["']?)([^",\s]+)\2/gi, (_match, prefix, quote, target) => {
        const resolved = resolveManifestUri(manifestUrl, target);
        const rewritten = isPinflixProxyUrl(resolved) ? resolved : toProxyUrl(resolved);
        return `${prefix}${quote}${rewritten}${quote}`;
      });
    }
    const resolved = resolveManifestUri(manifestUrl, line);
    return isPinflixProxyUrl(resolved) ? resolved : toProxyUrl(resolved);
  }).join("\n");
}

export function isHlsMimeType(value: string) {
  const type = value.toLowerCase();
  return type.includes("mpegurl") || type.includes("m3u8") || type.includes("x-mpegurl");
}

export async function assertSafeUpstream(rawUrl: string) {
  const parsed = new URL(rawUrl);

  if (! ["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS upstreams are allowed.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isBlockedHostname(hostname)) {
    throw new Error("Upstream host is not allowed.");
  }

  const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  const allowedPorts = hostPorts.get(hostname);
  if (hostname === "vod.cineplexbd.net" || hostname === "test-streams.mux.dev") {
    if (!allowedPorts || !allowedPorts.has(port)) {
      throw new Error("Upstream port is not allowed for this public host.");
    }
  } else if (hostname && !allowedHosts.has(hostname)) {
    throw new Error("Upstream host is not permitted.");
  }

  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length) throw new Error("Unable to resolve the upstream host.");
  if (addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error("Private or restricted upstream address is not allowed.");
  }
}

export function buildUpstreamHeaders(request: Request, omitRange = false) {
  const headers: Record<string, string> = {};
  const accept = request.headers.get("accept") ?? "application/vnd.apple.mpegurl,application/x-mpegURL,video/mp2t,*/*";
  headers.Accept = accept;

  if (!omitRange) {
    const range = request.headers.get("range");
    if (range) headers.Range = range;
  }

  const language = request.headers.get("accept-language");
  if (language) headers["Accept-Language"] = language;

  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers["User-Agent"] = userAgent;

  return headers;
}

export async function proxyUpstreamResponse(request: Request, upstreamUrl: URL) {
  await assertSafeUpstream(upstreamUrl.toString());

  // Detect manifest early so we can omit Range for manifest fetches.
  // This server returns 206 for all GET requests; sending Range would yield a
  // partial manifest and break rewriting.
  const isManifestPath = /(?:\.(m3u8|m3u))(?=$|[?#])/i.test(upstreamUrl.pathname);
  const upstream = await fetch(upstreamUrl, {
    headers: buildUpstreamHeaders(request, isManifestPath),
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) {
    throw new Error(`Upstream returned ${upstream.status}.`);
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  if (isHlsMimeType(contentType) || isManifestPath) {
    const manifest = await upstream.text();
    const rewritten = rewriteManifestText(manifest, upstreamUrl.toString());
    return new Response(rewritten, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/vnd.apple.mpegurl",
      },
    });
  }

  const headers = new Headers({
    "Cache-Control": "no-store",
  });

  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) headers.set("Content-Type", upstreamContentType);

  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);

  const acceptRanges = upstream.headers.get("accept-ranges");
  if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  if (!normalized) return true;
  if (normalized === "localhost") return true;
  if (normalized === "127.0.0.1" || normalized === "::1") return true;
  if (normalized.startsWith("127.")) return true;
  if (normalized.startsWith("[::1]")) return true;
  if (normalized.startsWith("10.") || normalized.startsWith("192.168.") || normalized.startsWith("169.254.")) return true;
  if (normalized.startsWith("172.")) {
    const parts = normalized.split(".");
    if (parts.length >= 2) {
      const second = Number(parts[1]);
      if (!Number.isNaN(second) && second >= 16 && second <= 31) return true;
    }
  }
  return false;
}

function isBlockedAddress(address: string) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    if (a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return true;
    }
    return false;
  }

  if (address === "::1") return true;
  if (address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:")) return true;
  return false;
}
