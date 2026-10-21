import { requestSource, parseJson } from '@/src/lib/cineplex/client';
export const CINEPLEX_BASE_URL = 'http://cineplexbd.net';
export const fetchHtml = requestSource;
export async function fetchJson(path: string, revalidate = 0): Promise<unknown> { return parseJson(await requestSource(path, revalidate)); }
export async function probeCineplexConnectivity() {
 const started = Date.now();
 try { await requestSource('/search_ajax.php?q=Avatar&limit=8', 30); return {reachable:true,status:200,latencyMs:Date.now()-started,outcome:'reachable'}; }
 catch { return {reachable:false,status:null,latencyMs:Date.now()-started,outcome:'network_error'}; }
}
