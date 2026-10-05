import "server-only";

type FetcherBinding = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

const CINEPLEX_HOSTS = new Set([
  "cineplexbd.net",
  "www.cineplexbd.net",
  "vod.cineplexbd.net",
]);

function normalizeUrl(input: string | URL) {
  const url = input instanceof URL ? new URL(input.toString()) : new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Unsupported CineplexBD URL protocol.");
  }
  if (!CINEPLEX_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Unsupported CineplexBD upstream host.");
  }
  return url;
}

async function getOriginBinding(): Promise<FetcherBinding | null> {
  try {
    const runtime = await import("cloudflare:workers");
    const candidate = runtime.env.CINEPLEX_ORIGIN as FetcherBinding | undefined;
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
  const binding = await getOriginBinding();

  if (binding && (url.hostname === "cineplexbd.net" || url.hostname === "www.cineplexbd.net")) {
    const internal = new URL(url.pathname + url.search, "https://cineplex-origin.internal");
    return binding.fetch(new Request(internal, init));
  }

  return fetch(url, init);
}

export function isAllowedCineplexUrl(input: string | URL) {
  try {
    normalizeUrl(input);
    return true;
  } catch {
    return false;
  }
}
