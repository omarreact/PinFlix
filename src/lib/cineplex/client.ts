import "server-only";
import { fetchCineplexOrigin } from '@/src/lib/cineplex-origin';
import { cached } from './cache';
import { CineplexError, sourceUrl } from './types';
let tokens = 12;
let refreshed = Date.now();
function acquire() {
  const now = Date.now();
  tokens = Math.min(12, tokens + (now - refreshed) / 1000); refreshed = now;
  if (tokens < 1) throw new CineplexError('RATE_LIMITED', 'Source request limit reached. Retry shortly.', 429);
  tokens -= 1;
}
export function requestSource(path: string, ttlSeconds = 60): Promise<string> {
  const url = sourceUrl(path);
  const configured = Number(process.env.CINEPLEX_CACHE_TTL_SECONDS);
  const ttl = Number.isFinite(configured) && configured >= 0 ? Math.min(configured, 3600) : ttlSeconds;
  return cached(url.href, ttl * 1000, async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      acquire();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      try {
        const response = await fetchCineplexOrigin(url, {signal: controller.signal, cache: 'no-store', headers: {Accept: 'application/json, text/html', 'User-Agent': 'PinFlixCatalog/1.0'}});
        if (!response.ok) {
          await response.body?.cancel();
          throw new CineplexError(response.status === 404 ? 'NOT_FOUND' : response.status === 403 || response.status === 401 ? 'RESTRICTED' : 'UPSTREAM_HTTP', `CineplexBD returned HTTP ${response.status}`, response.status === 404 ? 404 : response.status === 403 || response.status === 401 ? 403 : response.status === 429 ? 429 : 502);
        }
        const reader = response.body?.getReader();
        if (!reader) throw new CineplexError('EMPTY_RESPONSE', 'Source returned no body');
        const chunks: Uint8Array[] = []; let size = 0;
        while (true) {
          const {done, value} = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > 3_000_000) { await reader.cancel(); throw new CineplexError('RESPONSE_TOO_LARGE', 'Source response exceeds size limit'); }
          chunks.push(value);
        }
        const decoder = new TextDecoder();
        return chunks.map(chunk => decoder.decode(chunk, {stream: true})).join('') + decoder.decode();
      } catch (error) {
        const failure = controller.signal.aborted ? new CineplexError('TIMEOUT', 'CineplexBD request timed out', 504) : error instanceof CineplexError ? error : new CineplexError('NETWORK_ERROR', 'Cannot reach CineplexBD', 503);
        if (attempt === 1 || [400,403,404,429].includes(failure.status)) throw failure;
      } finally { clearTimeout(timeout); }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new CineplexError('NETWORK_ERROR', 'Cannot reach CineplexBD', 503);
  });
}
export function parseJson(text: string): unknown {
  try { return JSON.parse(text); } catch { throw new CineplexError('INVALID_JSON', 'CineplexBD returned invalid JSON'); }
}
