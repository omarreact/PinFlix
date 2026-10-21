import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeSearch, posterUrl } from '../src/lib/cineplex/normalize';
import { sourceUrl } from '../src/lib/cineplex/types';
import { parseCatalog, parseEpisodes, hasNextPage, parseSeasonNumbers } from '../src/lib/cineplex/parser';
import { parseJson, requestSource } from '../src/lib/cineplex/client';
import { cached, clearCache } from '../src/lib/cineplex/cache';
import { handle } from '../src/lib/cineplex/routes';
import { fetchCineplexOrigin } from '../src/lib/cineplex-origin';
// Synthetic fixtures model the live schema and sparse episode numbering, not an invented catalog.
const movie = {id:40804,title:'Avatar The Way of Water',type:'movie',year:'2022',poster:'poster.jpg',url:'/view.php?id=40804',category:'Dual Audio'};
const show = {id:10306,title:'Breaking Bad',type:'series',year:2008,url:'/watch.php?id=10306'};
const catalog = '<main><a href="view.php?id=40804"><img alt="Avatar" src="uploads/p.jpg"><p>Dual Audio • 2022</p></a><a href="watch.php?id=10306"><img alt="Breaking Bad"></a></main>';
const season = '<h1>Breaking Bad</h1><select name="season"><option value="2">Season 2</option><option value="1">Season 1</option></select><a class="ep-card" href="/watch.php?id=10306&season=1&ep=4"><span class="truncate">Fourth source entry</span></a><a class="ep-card" href="/watch.php?id=10306&season=1&ep=1">First</a>';
beforeEach(() => {clearCache();});
afterEach(() => {vi.unstubAllGlobals();vi.useRealTimers();});
describe('Cineplex normalization', () => {
 it('maps actual movie and TV URL forms with strict IDs and deduplicates IDs',() => {
  expect(normalizeSearch({results:[movie,show,movie]}).map(x=>[x.id,x.kind,x.detailUrl])).toEqual([['cb-movie-40804','movie','/view.php?id=40804'],['cb-series-10306','show','/watch.php?id=10306']]);
 });
 it('accepts array envelopes and Unicode titles',()=>expect(normalizeSearch([{...movie,title:'বাংলা 映画'}])[0].title).toBe('বাংলা 映画'));
 it('keeps different audio and quality editions rather than conflating IDs',()=>expect(normalizeSearch([movie,{...movie,id:2,url:'/view.php?id=2'}])).toHaveLength(2));
 it('handles missing posters and empty responses',()=>{expect(normalizeSearch([show])[0].poster).toBe('');expect(normalizeSearch({results:[]})).toEqual([]);});
 it('resolves bare filenames to the verified uploads path',()=>expect(decodeURIComponent(posterUrl('poster.jpg'))).toContain('http://cineplexbd.net/uploads/poster.jpg'));
 it.each(['javascript:alert(1)','http://127.0.0.1/a','http://cineplexbd.net.evil/a','https://user:password@cineplexbd.net/a','//evil.example/p.jpg'])('rejects unsafe poster %s',value=>expect(posterUrl(value)).toBe(''));
 it('validates JSON and result schema',()=>{expect(()=>parseJson('<html>oops</html>')).toThrow('invalid JSON');expect(()=>normalizeSearch({error:'failure'})).toThrow('Unexpected');expect(()=>normalizeSearch([{...movie,id:'../private'}])).toThrow('Invalid');});
 it('rejects external detail URLs and ID mismatches',()=>{expect(()=>normalizeSearch([{...movie,url:'http://localhost/view.php?id=40804'}])).toThrow();expect(()=>normalizeSearch([{...movie,url:'/view.php?id=7'}])).toThrow();});
});
describe('HTML parsing and sparse episodes',()=>{
 it('classifies movies and series without TMDB search',()=>expect(parseCatalog(catalog).map(x=>x.kind)).toEqual(['movie','show']));
 it('uses release year rather than upload timestamp',()=>expect(parseCatalog('<main><a href="view.php?id=1"><img alt="Test"><span>30 Aug 2025</span><p>Dual Audio • 2022</p></a></main>')[0].year).toBe(2022));
 it('ignores header suggestions outside main results',()=>expect(parseCatalog('<a href="view.php?id=2"><img alt="Header"></a>'+catalog)).toHaveLength(2));
 it('preserves episode ordering and missing numbers',()=>expect(parseEpisodes(season,'10306',1).map(x=>x.number)).toEqual([1,4]));
 it('extracts real titles and episode-specific source links',()=>expect(parseEpisodes(season,'10306',1)[1]).toMatchObject({title:'Fourth source entry',sourceUrl:'http://cineplexbd.net/watch.php?id=10306&season=1&ep=4',playback:'unverified'}));
 it('sorts seasons and distinguishes empty data from parser failure',()=>{expect(parseSeasonNumbers(season)).toEqual([1,2]);expect(parseEpisodes('<p>No episodes</p>','10306',1)).toEqual([]);expect(()=>parseEpisodes('<a class="ep-card" href="https://evil.net/watch.php?id=10306&ep=1&season=1">Bad</a>','10306',1)).toThrow('could not be parsed');});
 it('detects only the next page of the current query',()=>{expect(hasNextPage('<a href="/search.php?q=Avatar&page=2">2</a>',1,'/search.php?q=Avatar')).toBe(true);expect(hasNextPage('<a href="/search.php?q=other&page=2">2</a>',1,'/search.php?q=Avatar')).toBe(false);});
});
describe('request boundaries and APIs',()=>{
 it.each(['http://127.0.0.1','http://[::1]','http://169.254.169.254','file:///etc/passwd','http://cineplexbd.net:8080','http://cineplexbd.net@localhost/'])('rejects SSRF target %s',url=>expect(()=>sourceUrl(url)).toThrow());
 it('validates redirects before following them',async()=>{const mock=vi.fn().mockResolvedValue(new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}}));vi.stubGlobal('fetch',mock);await expect(fetchCineplexOrigin('http://cineplexbd.net/')).rejects.toThrow('host');expect(mock).toHaveBeenCalledTimes(1);});
 it('deduplicates in-flight requests and caches successes',async()=>{const load=vi.fn(async()=>7);expect(await Promise.all([cached('a',1000,load),cached('a',1000,load)])).toEqual([7,7]);await cached('a',1000,load);expect(load).toHaveBeenCalledTimes(1);});
 it('does not cache failures',async()=>{const load=vi.fn().mockRejectedValueOnce(new Error('oops')).mockResolvedValue(7);await expect(cached('a',1000,load)).rejects.toThrow();expect(await cached('a',1000,load)).toBe(7);});
 it('normalizes API suggestions and rejects invalid parameters',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({results:[movie,show]}))));const response=await handle(new Request('http://localhost/api/cineplex/search?q=Avatar&mode=suggest'),'search');expect(response.status).toBe(200);expect((await response.json()).results).toHaveLength(2);expect((await handle(new Request('http://localhost/api/cineplex/search?page=-1'),'search')).status).toBe(400);});
 it('forwards verified category filters upstream',async()=>{const mock=vi.fn().mockResolvedValue(new Response(catalog));vi.stubGlobal('fetch',mock);expect((await handle(new Request('http://localhost/api/cineplex/search?type=movie&category=Animation&year=2022&letter=A'),'search')).status).toBe(200);expect(String(mock.mock.calls[0][0])).toContain('year=2022');expect(String(mock.mock.calls[0][0])).toContain('letter=A');});
 it('returns meaningful 404 without retries',async()=>{const fetcher=vi.fn().mockResolvedValue(new Response('',{status:404}));vi.stubGlobal('fetch',fetcher);const response=await handle(new Request('http://localhost/api/cineplex/details?id=123'),'details');expect(response.status).toBe(404);expect(fetcher).toHaveBeenCalledTimes(1);});
 it('returns invalid JSON as upstream failure',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>error</html>')));expect((await handle(new Request('http://localhost/api/cineplex/search?q=x&mode=suggest'),'search')).status).toBe(502);});
 it('retries 500 responses once and returns 502',async()=>{const mock=vi.fn().mockImplementation(async()=>new Response('',{status:500}));vi.stubGlobal('fetch',mock);await expect(requestSource('/view.php?id=500')).rejects.toMatchObject({status:502});expect(mock).toHaveBeenCalledTimes(2);});
 it('times out requests with a bounded retry',async()=>{const timer = globalThis.setTimeout; vi.stubGlobal('setTimeout', (fn: () => void, delay: number) => timer(fn, delay === 7000 ? 10 : delay));vi.stubGlobal('fetch',vi.fn((_url,init)=>new Promise((_resolve,reject)=>{if(init.signal.aborted) reject(new Error('abort'));else init.signal.addEventListener('abort',()=>reject(new Error('abort')));})));const result=requestSource('/view.php?id=504');const assertion=expect(result).rejects.toMatchObject({status:504,code:'TIMEOUT'});await assertion;});
});
