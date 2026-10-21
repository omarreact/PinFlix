"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
type Data = {seasons:number[]; season:number; episodes:{number:number;title:string;sourceUrl:string;playback:string}[]};
export function CineplexEpisodes({id}: {id:string}) {
  const [season,setSeason] = useState(1);
  const [state,setState] = useState<{data?:Data;error?:string;loading:boolean}>({loading:true});
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/cineplex/episodes?' + new URLSearchParams({id,season:String(season)}),{signal:controller.signal})
      .then(async response => {const json = await response.json();if (!response.ok) throw new Error(json.error || 'Episodes unavailable');return json as Data;})
      .then(data => {if (!controller.signal.aborted) setState({data,loading:false});})
      .catch(error => {if (!controller.signal.aborted) setState({error:error.message,loading:false});});
    return () => controller.abort();
  },[id,season]);
  return <section className="glass-panel min-w-0 rounded-3xl p-5 sm:p-8" aria-label="Series episodes">
    <h2 className="mb-4 text-xl font-bold">Seasons and episodes</h2>
    <label className="flex items-center gap-3">Season<select aria-label="Season" value={season} onChange={event => {setState(current => ({...current,loading:true}));setSeason(Number(event.target.value));}} className="rounded-xl bg-surface p-3">{(state.data?.seasons.length ? state.data.seasons:[season]).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    {state.loading ? <p role="status" className="mt-4 text-zinc-400">Loading episodes…</p> : state.error ? <div role="alert" className="mt-4 text-zinc-400">{state.error}<button onClick={() => {setSeason(1);}} className="ml-3 text-accent">Season 1</button></div> : <>
      <p className="my-4 text-sm text-zinc-400">Source entries are shown as published. Playback is unverified; titles and numbering may contain source errors.</p>
      {!state.data?.episodes.length && <p role="status">No episode links are available for this season.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{state.data?.episodes.map(episode => <article key={episode.number} className="min-w-0 rounded-xl border border-white/10 p-4">
        <p className="font-semibold">Episode {episode.number}</p><p className="mt-1 break-words text-sm text-zinc-400">{episode.title}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm"><Link href={`/watch/cb-series-${id}?season=${season}&episode=${episode.number}`} className="text-accent">Open player</Link><a href={episode.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-300">Source episode ↗</a></div>
        <p className="mt-2 text-xs text-zinc-500">Playback: {episode.playback}</p>
      </article>)}</div>
    </>}
  </section>;
}
