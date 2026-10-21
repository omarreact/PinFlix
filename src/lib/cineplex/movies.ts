import "server-only";
import { requestSource } from './client';
import { detail } from './parser';
export async function movie(id: string) {
  const path = '/view.php?id=' + encodeURIComponent(id);
  return {item:detail(await requestSource(path,300),path,id,'movie'), playback:'unverified' as const};
}
