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
  return url;
}

function getHttpEdgeBase(): URL | null {
  const raw = process.env.CINEPLEX_EDGE_URL?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) {
      return null;
    }
    url.search = "";
    return url;
  } catch {
    return null;
  }
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

  const edgeBase = getHttpEdgeBase();
  if (edgeBase) {
    const edgeUrl = new URL(edgeBase.toString());
    edgeUrl.searchParams.set("url", url.toString());
    return fetch(edgeUrl, init);
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
