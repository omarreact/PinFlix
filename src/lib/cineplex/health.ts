import "server-only";
import { requestSource, parseJson } from './client';
import { normalizeSearch } from './normalize';
export async function health() {
  const started = Date.now();
  normalizeSearch(parseJson(await requestSource('/search_ajax.php?q=Avatar&limit=8',30)));
  return {provider:'cineplexbd', status:'healthy', endpoint:'/search_ajax.php', latencyMs:Date.now()-started, playback:'unverified'};
}
