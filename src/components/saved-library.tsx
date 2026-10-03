"use client";

import Link from "next/link";
import { Bookmark, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { readSavedTitles, writeSavedTitles, type SavedTitle } from "@/src/lib/saved";

export function SavedLibrary() {
  const [items, setItems] = useState<SavedTitle[]>([]);

  useEffect(() => {
    const sync = () => setItems(readSavedTitles());
    sync();
    window.addEventListener("pinflix:saved", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pinflix:saved", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function remove(id: string) {
    const next = readSavedTitles().filter((item) => item.id !== id);
    writeSavedTitles(next);
    setItems(next);
  }

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[.02] px-6 py-20 text-center">
        <Bookmark className="mx-auto text-zinc-600" size={44} />
        <h2 className="mt-4 text-xl font-bold text-zinc-300">Your list is empty</h2>
        <p className="mt-2 text-sm text-zinc-500">Open a title and choose Add to My List.</p>
        <Link href="/" className="tv-focus accent-gradient mt-6 inline-flex rounded-full px-6 py-3 text-sm font-bold text-white">
          Discover titles
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-6">
      {items.map((item) => (
        <article key={item.id} className="group relative">
          <Link href={`/entertainment/${item.slug}`} className="movie-card tv-focus relative block aspect-[2/3] overflow-hidden rounded-2xl border border-white/5 bg-surface">
            {item.poster ? (
              <img src={item.poster} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="poster-fallback grid h-full place-items-center p-4 text-center font-bold text-white/70">{item.title}</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className="line-clamp-2 text-sm font-bold text-white">{item.title}</h3>
              <p className="mt-1 text-[11px] text-accent">{item.kind === "show" ? "Series" : "Movie"}{item.year ? ` · ${item.year}` : ""}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => remove(item.id)}
            aria-label={`Remove ${item.title} from My List`}
            className="tv-focus absolute right-2 top-2 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/60 text-zinc-300 opacity-100 backdrop-blur hover:bg-red-500/80 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Trash2 size={16} />
          </button>
        </article>
      ))}
    </div>
  );
}
