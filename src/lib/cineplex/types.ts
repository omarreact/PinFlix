import "server-only";
export class CineplexError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}
export const ORIGIN = "http://cineplexbd.net";
export function sourceUrl(value: string, base = ORIGIN): URL {
  const url = new URL(value, base);
  if (!['http:', 'https:'].includes(url.protocol) || !['cineplexbd.net', 'www.cineplexbd.net'].includes(url.hostname) || url.username || url.password || url.port) {
    throw new CineplexError('UNSAFE_URL', 'Unsupported source URL', 400);
  }
  return url;
}
export type PlaybackState = 'available' | 'unverified' | 'unavailable' | 'restricted' | 'network_error';
export type Episode = { number: number; season: number; title: string; sourceUrl: string; playback: PlaybackState };
