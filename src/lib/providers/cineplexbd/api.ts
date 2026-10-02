export const CINEPLEX_BASE_URL = "http://cineplexbd.net";

const CATALOG_TIMEOUT_MS = 8_000;

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

function configuredCatalogRelay() {
  const raw = process.env.CINEPLEX_CATALOG_RELAY_URL?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isCatalogRelayConfigured() {
  return configuredCatalogRelay() !== null;
}

function publicCineplexUrl(path: string) {
  return path.startsWith("http")
    ? new URL(path)
    : new URL(path.startsWith("/") ? path : `/${path}`, CINEPLEX_BASE_URL);
}

function toCineplexUrl(path: string) {
  const target = publicCineplexUrl(path);
  const relay = configuredCatalogRelay();

  if (!relay) return target.toString();

  const relayUrl = new URL(relay);
  const basePath = relayUrl.pathname.replace(/\/$/, "");
  relayUrl.pathname = `${basePath}${target.pathname}`;
  relayUrl.search = target.search;
  return relayUrl.toString();
}

export async function fetchHtml(path: string, revalidate = 0): Promise<string> {
  const url = toCineplexUrl(path);
  const response = await fetch(url, revalidate > 0
    ? {
        headers,
        next: { revalidate },
        signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
      }
    : {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
      });
  if (!response.ok) throw new Error(`Failed to fetch catalog resource: HTTP ${response.status}`);
  return response.text();
}

export async function fetchJson(path: string, revalidate = 0): Promise<unknown> {
  const url = toCineplexUrl(path);
  const response = await fetch(url, revalidate > 0
    ? {
        headers,
        next: { revalidate },
        signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
      }
    : {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
      });
  if (!response.ok) throw new Error(`Failed to fetch catalog JSON: HTTP ${response.status}`);
  return response.json();
}

export async function probeCineplexConnectivity(timeoutMs = 8_000) {
  const startedAt = Date.now();
  try {
    const response = await fetch(toCineplexUrl("/"), {
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

    return {
      reachable: true,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      transport: isCatalogRelayConfigured() ? "relay" : "direct",
      outcome:
        response.status >= 200 && response.status < 400
          ? "reachable"
          : "http_error",
    } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const outcome =
      message.includes("timeout") || message.includes("aborted")
        ? "timeout"
        : message.includes("dns") || message.includes("resolve") || message.includes("getaddrinfo")
          ? "dns_error"
          : "network_error";

    return {
      reachable: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      transport: isCatalogRelayConfigured() ? "relay" : "direct",
      outcome,
    } as const;
  }
}
