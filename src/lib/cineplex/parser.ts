import "server-only";
import * as cheerio from 'cheerio';
import { parseCatalog as legacyCatalog, parseDetails, parseSeasonNumbers } from '@/src/lib/providers/cineplexbd/parser';
import { sourceUrl, type Episode, CineplexError } from './types';
import { deduplicate, posterUrl } from './normalize';
export { parseDetails, parseSeasonNumbers };
export function parseCatalog(html: string) {
  const $ = cheerio.load(html);
  if (!html.trim() || /login|sign in|access denied|forbidden/i.test($('title').text())) throw new CineplexError('PARSER_ERROR', 'Source did not return a catalog page');
  // Scope to main: related titles and header suggestions are not search matches.
  const content = $('main').length ? $('main').html()! : html;
  return deduplicate(legacyCatalog(content).filter(item => /^\d+$/.test(item.providerId ?? '')).map(item => {
    const url = sourceUrl(item.detailUrl!);
    return {...item, detailUrl:url.pathname+url.search, category: item.genres[0]?.split(/[•·]/)[0].trim()};
  }));
}
export function hasNextPage(html: string, page: number, path: string) {
  const $ = cheerio.load(html); const current = sourceUrl(path);
  return $('a[href]').toArray().some(a => {
    try { const link = sourceUrl($(a).attr('href')!); return ['year','genre','letter'].every(key => (link.searchParams.get(key) ?? '') === (current.searchParams.get(key) ?? '')) && link.pathname === current.pathname && (link.searchParams.get('q') ?? '') === (current.searchParams.get('q') ?? '') && (link.searchParams.get('category') ?? '') === (current.searchParams.get('category') ?? '') && Number(link.searchParams.get('page')) === page + 1; } catch { return false; }
  });
}
export function parseEpisodes(html: string, id: string, season: number): Episode[] {
  const $ = cheerio.load(html); const episodes = new Map<number, Episode>();
  $('a.ep-card[href], a[data-ep][href]').each((_, node) => {
    const a = $(node);
    try {
      const url = sourceUrl(a.attr('href')!);
      const number = Number(url.searchParams.get('ep'));
      if (url.pathname !== '/watch.php' || (url.searchParams.get('id') ?? url.searchParams.get('series_id')) !== id || Number(url.searchParams.get('season')) !== season || !Number.isInteger(number) || number < 1 || number > 10000) return;
      episodes.set(number, {number, season, title:a.find('.truncate').first().text().trim() || `Episode ${number}`, sourceUrl:url.href, playback:'unverified'});
    } catch { /* Reject unsafe source links. */ }
  });
  if (!episodes.size && /ep-card|data-ep=/.test(html)) throw new CineplexError('PARSER_ERROR', 'Episode links could not be parsed');
  return [...episodes.values()].sort((a,b) => a.number-b.number);
}
export function detail(html: string, path: string, id: string, type: 'movie'|'series') {
  const $ = cheerio.load(html);
  const title = $('h1').first().text().trim() || $('title').text().replace(/\s*— Watch$/, '').trim();
  if (!title || /not found|error|login|sign in/i.test(title)) throw new CineplexError('NOT_FOUND', 'Title not available', 404);
  const partial = parseDetails(html, path);
  const poster = partial.poster || posterUrl($('meta[property="og:image"]').attr('content'));
  const key = `cb-${type === 'series' ? 'series':'movie'}-${id}`;
  return { ...partial, id:key, slug:key, provider:'cineplexbd', providerId:id, kind:type === 'series' ? 'show' as const:'movie' as const, title, genres:partial.genres ?? [], poster, backdrop:poster, synopsis:partial.synopsis ?? '', detailUrl:path };
}
