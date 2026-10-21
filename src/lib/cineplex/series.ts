import "server-only";
import { requestSource } from './client';
import { detail, parseEpisodes, parseSeasonNumbers } from './parser';
export async function series(id: string, season = 1) {
  const path = '/watch.php?' + new URLSearchParams({id,season:String(season)});
  const html = await requestSource(path, 300);
  const seasons = parseSeasonNumbers(html);
  const episodes = parseEpisodes(html,id,season);
  return {item:detail(html,path,id,'series'), seasons, season, episodes, discovery: episodes.length ? 'available':'unavailable', playback:'unverified' as const};
}
