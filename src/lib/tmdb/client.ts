import "server-only";

const TMDB_API_URL = "https://api.themoviedb.org/3";

interface TMDBFetchOptions {
  revalidate?: number;
  cache?: RequestCache;
}

export class TMDBError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "TMDBError";
  }
}

export function isTMDBConfigured(): boolean {
  return Boolean(process.env.TMDB_READ_ACCESS_TOKEN);
}

export async function tmdbFetch<T>(
  endpoint: string,
  searchParams: Record<string, string | number | boolean | undefined> = {},
  options: TMDBFetchOptions = {},
): Promise<T> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) throw new TMDBError("TMDB_READ_ACCESS_TOKEN is not configured.");

  const url = new URL(`${TMDB_API_URL}${endpoint}`);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const init: RequestInit & { next?: { revalidate: number } } = {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  };

  if (options.cache === "no-store") {
    init.cache = "no-store";
  } else {
    init.next = { revalidate: options.revalidate ?? 3600 };
  }

  const response = await fetch(url, init);
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { status_message?: string };
      if (body.status_message) detail = `: ${body.status_message}`;
    } catch {}
    throw new TMDBError(`TMDB request failed (${response.status})${detail}`, response.status);
  }

  return response.json() as Promise<T>;
}
