import Link from "next/link";
import { ChannelRail, EntertainmentRail } from "@/src/components/catalog-sections";
import { channels, entertainment } from "@/src/lib/iptv/catalog";

export default function HomePage() {
  return <div className="space-y-12">
    <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-7 md:p-12">
      <div className="hero-gradient absolute inset-0" />
      <div className="relative max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Find. Play. Watch.</p><h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Your next favorite stream is one search away.</h1><p className="mt-5 max-w-xl text-muted">Jump into live channels, discover new stories, and keep your watchlist close.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/search" className="tv-focus rounded-xl bg-brand px-5 py-3 font-bold">Search PinFlix</Link><Link href="/browse" className="tv-focus rounded-xl border border-line bg-surface-2 px-5 py-3 font-bold">Browse Live TV</Link></div></div>
    </section>
    <ChannelRail title="Hot Now" channels={channels.slice(0, 4)} href="/browse" />
    <ChannelRail title="Featured Live" channels={channels.slice(4)} href="/browse" />
    <EntertainmentRail title="Movies & Shows" items={entertainment} href="/movies" />
  </div>;
}
