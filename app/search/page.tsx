"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChannelCard } from "@/src/components/channel-card";
import { EntertainmentCard } from "@/src/components/entertainment/card";
import type { ChannelPreview, Entertainment } from "@/src/types/catalog";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [channels, setChannels] = useState<ChannelPreview[]>([]);
  const [entertainment, setEntertainment] = useState<Entertainment[]>([]);
  const [loading, setLoading] = useState(false);
  
  const normalized = query.trim().toLowerCase();

  useEffect(() => {
    if (!normalized) {
      setChannels([]);
      setEntertainment([]);
      return;
    }
    
    setLoading(true);
    const debounceId = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(normalized)}`)
        .then(r => r.json())
        .then(data => {
          setChannels(data.channels || []);
          setEntertainment(data.entertainment || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 400);

    return () => clearTimeout(debounceId);
  }, [normalized]);

  return <div className="space-y-8"><div><Link href="/" className="text-sm font-semibold text-muted hover:text-ink">← Home</Link><h1 className="mt-6 text-3xl font-black">Search PinFlix</h1><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search channels, movies, shows..." className="mt-5 w-full rounded-2xl border border-line bg-surface px-5 py-4 text-ink placeholder:text-muted focus:border-brand" /></div>{!normalized ? <p className="text-muted">Try a channel, country, genre, movie, or show.</p> : loading ? <p className="text-muted animate-pulse">Searching...</p> : <><section><h2 className="mb-4 text-xl font-bold">Channels <span className="text-sm font-normal text-muted">({channels.length})</span></h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{channels.map((channel) => <ChannelCard key={channel.id} channel={channel} />)}</div></section><section><h2 className="mb-4 text-xl font-bold">Movies & Shows <span className="text-sm font-normal text-muted">({entertainment.length})</span></h2><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{entertainment.map((item) => <EntertainmentCard key={item.id} item={item} />)}</div></section></>}</div>;
}
