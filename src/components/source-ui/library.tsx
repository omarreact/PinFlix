"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bookmark, ArrowUpRight } from "lucide-react";
import { HISTORY_KEY, historyHref, readHistory } from "@/src/lib/history";
import { SAVED_KEY, readSavedTitles } from "@/src/lib/saved";
import { toTitle } from "@/src/lib/source-ui";
import { Card } from "./cards";
function subscribe(callback: () => void) {
  window.addEventListener("pinflix:saved", callback);
  window.addEventListener("pinflix:history", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("pinflix:saved", callback);
    window.removeEventListener("pinflix:history", callback);
    window.removeEventListener("storage", callback);
  };
}
function snapshot() {
  try {
    return `${localStorage.getItem(SAVED_KEY) ?? "[]"}\n${localStorage.getItem(HISTORY_KEY) ?? "[]"}`;
  } catch {
    return "[]\n[]";
  }
}
function useLibrary() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "[]\n[]");
  return value === "[]\n[]"
    ? { saved: [], recent: [] }
    : { saved: readSavedTitles(), recent: readHistory() };
}
export function ContinueWatching() {
  const { recent } = useLibrary();
  const entries = recent.filter(
    (entry) =>
      entry.duration > 0 &&
      entry.position > 5 &&
      !entry.completed &&
      entry.position / entry.duration < 0.95,
  );
  if (!entries.length) return null;
  return (
    <section className="section continue-watching-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">RESUME PLAYBACK</p>
          <h2>Continue watching</h2>
        </div>
      </div>
      <div className="card-row">
        {entries.map((entry) => (
          <Card
            key={`${entry.id}-${entry.season}-${entry.episode}`}
            title={toTitle(entry)}
            href={historyHref(entry)}
            progress={(entry.position / entry.duration) * 100}
            subtitle={
              entry.kind === "show"
                ? `S${entry.season} · E${entry.episode}`
                : `${Math.round(entry.position / 60)}m / ${Math.round(entry.duration / 60)}m`
            }
          />
        ))}
      </div>
    </section>
  );
}
export function Library({
  initialTab = "list",
}: {
  initialTab?: "list" | "history";
}) {
  const { saved, recent } = useLibrary();
  const [tab, setTab] = useState(initialTab);
  const titles =
    tab === "list"
      ? saved.map(toTitle)
      : [
          ...new Map(
            recent.map((entry) => [entry.id, toTitle(entry)]),
          ).values(),
        ];
  return (
    <div className="page-content browse-page">
      <div className="page-title">
        <p className="eyebrow">CURATED BY YOU</p>
        <h1>Your own little cinema.</h1>
        <p>Favourites and watching progress stay on this device.</p>
      </div>
      <ContinueWatching />
      <div className="tabs">
        <button
          type="button"
          className={tab === "list" ? "active" : ""}
          aria-pressed={tab === "list"}
          onClick={() => setTab("list")}
        >
          My List <span>{saved.length}</span>
        </button>
        <button
          type="button"
          className={tab === "history" ? "active" : ""}
          aria-pressed={tab === "history"}
          onClick={() => setTab("history")}
        >
          Watch history <span>{recent.length}</span>
        </button>
      </div>
      {titles.length ? (
        <div className="card-grid">
          {titles.map((title) => (
            <Card key={title.id} title={title} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <Bookmark size={32} />
          <h2>
            {tab === "list"
              ? "Make it your collection."
              : "Your story starts here."}
          </h2>
          <p>
            {tab === "list"
              ? "Save a film or series and find it here whenever you’re ready."
              : "Titles you watch will appear here."}
          </p>
          <Link href="/movies" className="primary">
            Explore movies <ArrowUpRight size={17} />
          </Link>
        </div>
      )}
    </div>
  );
}
