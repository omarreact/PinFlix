import "server-only";

type FetcherBinding = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

const CINEPLEX_HOSTS = new Set([
  "cineplexbd.net",
  "www.cineplexbd.net",
  "vod.cineplexbd.net",
  "cds3.cineplexbd.net",
]);

function normalizeUrl(input: string | URL) {
  const url = input instanceof URL ? new URL(input.toString()) : new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Unsupported CineplexBD URL protocol.");
  }
  if (!CINEPLEX_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Unsupported CineplexBD upstream host.");
  }
  if (url.username || url.password || (url.port && !["80", "443", "8081"].includes(url.port))) {
    throw new Error("Unsupported CineplexBD credentials or port.");
  }
  return url;
}

async function getEdgeBinding(): Promise<FetcherBinding | null> {
  try {
    const runtime = await import("cloudflare:workers");
    const candidate = runtime.env.CINEPLEX_EDGE as FetcherBinding | undefined;
    if (candidate && typeof candidate.fetch === "function") return candidate;
  } catch {
    // Standard Next.js/Node builds do not provide cloudflare:workers.
  }
  return null;
}

export async function fetchCineplexOrigin(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  const url = normalizeUrl(input);
  const binding = await getEdgeBinding();

  if (binding) {
    if (url.hostname === "cineplexbd.net" || url.hostname === "www.cineplexbd.net") {
      const internal = new URL(
        `/catalog${url.pathname}${url.search}`,
        "https://pinflix-media-edge.internal",
      );
      return binding.fetch(new Request(internal, init));
    }

    const internal = new URL("https://pinflix-media-edge.internal/");
    internal.searchParams.set("url", url.toString());
    return binding.fetch(new Request(internal, init));
  }

  // Validate every redirect before following it, so an allowed origin cannot
  // redirect the proxy into a private service or an unrelated host.
  for (let hop = 0; hop < 5; hop += 1) {
    const response = await fetch(url, { ...init, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status) || init.redirect === "manual") return response;
    const location = response.headers.get("location");
    if (!location) return response;
    await response.body?.cancel();
    const target = normalizeUrl(new URL(location, url));
    url.href = target.href;
  }
  throw new Error("Too many CineplexBD redirects.");
}

export function isAllowedCineplexUrl(input: string | URL) {
  try {
    normalizeUrl(input);
    return true;
  } catch {
    return false;
  }
}
