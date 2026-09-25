const BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function tmdbImage(path: string | null | undefined, size: "w185" | "w342" | "w500" | "w780" | "w1280" | "original" = "w500") {
  if (!path) return "";
  return `${IMAGE_BASE}/${size}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Same env names as live-iptv: TMDB_API_READ_TOKEN (preferred) or TMDB_API_KEY. Also accepts TMDB_ACCESS_TOKEN. */
function getTmdbToken() {
  return (
    process.env.TMDB_API_READ_TOKEN?.trim() ||
    process.env.TMDB_ACCESS_TOKEN?.trim() ||
    ""
  );
}

function getTmdbApiKey() {
  return process.env.TMDB_API_KEY?.trim() || "";
}

export function isTmdbConfigured() {
  return Boolean(getTmdbToken() || getTmdbApiKey());
}

export async function tmdbFetch<T>(path: string, revalidate = 3600): Promise<T> {
  const token = getTmdbToken();
  const apiKey = getTmdbApiKey();

  if (!token && !apiKey) {
    throw new Error("TMDB is not configured. Set TMDB_API_READ_TOKEN or TMDB_API_KEY.");
  }

  const url = new URL(path.startsWith("http") ? path : `${BASE}${path.startsWith("/") ? path : `/${path}`}`);
  if (!token && apiKey) url.searchParams.set("api_key", apiKey);

  const headers: HeadersInit = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url.toString(), {
    headers,
    next: { revalidate },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`TMDB ${response.status}: ${url.pathname}`);
  }

  return response.json() as Promise<T>;
}
