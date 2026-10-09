"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { HISTORY_KEY, historyHref, readHistory, writeHistory } from "@/src/lib/history";

function subscribe(callback: () => void) {
  window.addEventListener("pinflix:history", callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener("pinflix:history", callback); window.removeEventListener("storage", callback); };
}
function snapshot() { try { return localStorage.getItem(HISTORY_KEY) ?? "[]"; } catch { return "[]"; } }

export function WatchHistory({ compact = false }: { compact?: boolean }) {
  const data = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const entries = data === "[]" ? [] : readHistory().filter((entry) => !compact || (entry.position > 20 && !entry.completed));
  if (compact && !entries.length) return null;
  return <section className="space-y-5">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{compact ? "Continue watching" : "Watch history"}</h2>
      {!compact && entries.length > 0 && <button type="button" className="media-focus rounded-xl border border-white/10 px-4 py-2 text-sm" onClick={() => { if (window.confirm("Clear your watch history?")) writeHistory([]); }}>Clear history</button>}
    </div>
    {!entries.length && <p className="text-sm text-zinc-400">Your recently watched titles will appear here.</p>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.slice(0, compact ? 6 : 100).map((entry) =>
        <article key={`${entry.id}-${entry.season}-${entry.episode}`} className="rounded-xl border border-white/10 bg-white/[.035] p-5">
          <h3 className="font-semibold">{entry.title}</h3>
          {entry.episode && <p className="mt-2 text-sm text-zinc-400">Season {entry.season} · Episode {entry.episode}</p>}
          <p className="mt-2 text-sm text-zinc-400">{entry.completed ? "Completed" : `${Math.floor(entry.position / 60)} minutes watched`}</p>
          <progress className="mt-4 h-1 w-full accent-red-500" value={entry.position} max={Math.max(entry.duration || 1, entry.position)} aria-label="Watch progress" />
          <div className="mt-4 flex gap-4">
            <Link className="media-focus rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15" href={historyHref(entry)}>{entry.completed ? "Watch again" : "Resume"}</Link>
            {!compact && <button type="button" className="media-focus rounded-lg px-3 text-sm text-zinc-400 hover:text-white" onClick={() => writeHistory(readHistory().filter((item) => !(item.id === entry.id && item.season === entry.season && item.episode === entry.episode)))}>Remove</button>}
          </div>
        </article>)}
    </div>
  </section>;
}
