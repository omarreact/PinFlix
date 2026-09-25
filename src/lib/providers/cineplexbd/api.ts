export const CINEPLEX_BASE_URL = "http://cineplexbd.net";

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

function toCineplexUrl(path: string) {
  return path.startsWith("http")
    ? path
    : `${CINEPLEX_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchHtml(path: string, revalidate = 3600): Promise<string> {
  const url = toCineplexUrl(path);
  const response = await fetch(url, {
    headers,
    next: { revalidate },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  return response.text();
}

export async function fetchJson(path: string, revalidate = 3600): Promise<unknown> {
  const url = toCineplexUrl(path);
  const response = await fetch(url, {
    headers,
    next: { revalidate },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Failed to fetch JSON ${url}: HTTP ${response.status}`);
  return response.json();
}
