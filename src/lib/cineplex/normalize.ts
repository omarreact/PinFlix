import "server-only";
import { z } from 'zod';
import type { Entertainment } from '@/src/types/catalog';
import { CineplexError, ORIGIN, sourceUrl } from './types';
const itemSchema = z.object({id: z.union([z.string(), z.number()]).transform(String).pipe(z.string().regex(/^\d+$/)), title: z.string().trim().min(1), type: z.string().optional(), poster: z.string().nullish(), category: z.string().optional(), year: z.union([z.string(), z.number()]).nullish(), url: z.string().optional()});
export function posterUrl(value?: string | null): string {
  if (!value) return '';
  try {
    const url = new URL(value, ORIGIN);
    if (url.username || url.password || url.port || !['http:', 'https:'].includes(url.protocol)) return '';
    if (url.hostname === 'image.tmdb.org' && url.protocol === 'https:') return url.href;
    sourceUrl(url.href);
    // The live autocomplete returns bare filenames; live HTML places them in uploads/.
    if (!value.includes('/')) url.pathname = '/uploads/' + value;
    return '/api/proxy-image?url=' + encodeURIComponent(url.href);
  } catch { return ''; }
}
export function normalizeSearch(json: unknown): Entertainment[] {
  const envelope = z.union([z.array(z.unknown()), z.object({results: z.array(z.unknown())})]).safeParse(json);
  if (!envelope.success) throw new CineplexError('INVALID_SCHEMA', 'Unexpected CineplexBD search response');
  const rows = Array.isArray(envelope.data) ? envelope.data : envelope.data.results;
  const items: Entertainment[] = [];
  for (const row of rows) {
    const parsed = itemSchema.safeParse(row);
    if (!parsed.success) throw new CineplexError('INVALID_SCHEMA', 'Invalid CineplexBD search item');
    const item = parsed.data;
    const kind = /series|tv|show|episode/i.test(item.type ?? '') || /(?:watch|tview)\.php/.test(item.url ?? '') ? 'show' : 'movie';
    const url = sourceUrl(item.url || `/${kind === 'show' ? 'watch' : 'view'}.php?id=${item.id}`);
    if (!['/view.php','/watch.php','/tview.php'].includes(url.pathname) || (url.searchParams.get('id') ?? url.searchParams.get('series_id')) !== item.id) throw new CineplexError('INVALID_SCHEMA', 'Invalid detail URL');
    const id = `cb-${kind === 'show' ? 'series' : 'movie'}-${item.id}`;
    const poster = posterUrl(item.poster);
    const year = Number(item.year);
    items.push({id, slug:id, provider:'cineplexbd', providerId:item.id, title:item.title, kind, category:item.category, genres:item.category ? [item.category] : [], poster, backdrop:poster, synopsis:'', detailUrl:url.pathname+url.search, ...(year >= 1800 && year <= 2200 ? {year} : {})});
  }
  return deduplicate(items);
}
export function deduplicate(items: Entertainment[]) {
  return [...new Map(items.map(item => [item.id, item])).values()];
}
