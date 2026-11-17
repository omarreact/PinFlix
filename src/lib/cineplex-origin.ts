import "server-only";

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
  if (url.username || url.password || url.hash) {
    throw new Error("Unsupported CineplexBD URL credentials or fragment.");
  }
  if (url.pathname.toLowerCase().startsWith("/admin")) {
    throw new Error("CineplexBD administration paths are excluded.");
  }
  return url;
}

export async function fetchCineplexOrigin(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  const url = normalizeUrl(input);
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
