import type { ChannelPreview, Entertainment } from "@/src/types/catalog";

export const channels: ChannelPreview[] = [
  { id: "pin-news", name: "Pin News", country: "Global", countryCode: "gl", category: "News", groups: ["News", "Featured"], logo: "🛰️", description: "A calm, rolling stream of global headlines and live updates.", accent: "#ef476f", isLive: true, quality: "HD", availability: "available", epg: { now: "World News Live", next: "Market Briefing" } },
  { id: "pin-sports", name: "Pin Sports", country: "United States", countryCode: "us", category: "Sports", groups: ["Sports", "Featured"], logo: "🏟️", description: "Matchday coverage, highlights and sports desk analysis.", accent: "#5eead4", isLive: true, quality: "HD", availability: "available", epg: { now: "Live Sports Desk", next: "The Replay" } },
  { id: "city-lights", name: "City Lights", country: "United Kingdom", countryCode: "gb", category: "Entertainment", groups: ["Entertainment", "Featured"], logo: "🌃", description: "Late-night culture, music sessions and city stories.", accent: "#a78bfa", isLive: true, quality: "HD", availability: "available", epg: { now: "City Sessions", next: "After Dark" } },
  { id: "nature-loop", name: "Nature Loop", country: "Canada", countryCode: "ca", category: "Documentary", groups: ["Documentary"], logo: "🌲", description: "Slow television from the world's most beautiful wild places.", accent: "#86efac", isLive: true, quality: "HD", availability: "available", epg: { now: "Northern Trails", next: "Ocean Quiet" } },
  { id: "kids-corner", name: "Kids Corner", country: "Australia", countryCode: "au", category: "Kids", groups: ["Kids"], logo: "🪁", description: "Bright, gentle programming for curious young viewers.", accent: "#fbbf24", isLive: true, quality: "HD", availability: "available", epg: { now: "Story Time", next: "Creative Club" } },
  { id: "indie-screen", name: "Indie Screen", country: "France", countryCode: "fr", category: "Movies", groups: ["Movies"], logo: "🎞️", description: "Independent cinema, shorts and filmmaker conversations.", accent: "#fb7185", isLive: true, quality: "HD", availability: "available", epg: { now: "Short Film Hour", next: "Director's Cut" } },
];

export const entertainment: Entertainment[] = [
  { id: "neon-run", slug: "neon-run", title: "Neon Run", kind: "movie", year: 2024, rating: 8.1, genres: ["Action", "Sci-Fi"], backdrop: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1400&q=80", poster: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=600&q=80", synopsis: "A courier races across a sleepless megacity with one night to change the future." },
  { id: "the-last-signal", slug: "the-last-signal", title: "The Last Signal", kind: "movie", year: 2023, rating: 7.8, genres: ["Thriller", "Drama"], backdrop: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1400&q=80", poster: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=600&q=80", synopsis: "When a forgotten broadcast returns, a radio producer follows its signal into the unknown." },
  { id: "shoreline", slug: "shoreline", title: "Shoreline", kind: "show", year: 2024, rating: 8.7, genres: ["Drama", "Mystery"], backdrop: "https://images.unsplash.com/photo-1476673160081-cf065607f449?w=1400&q=80", poster: "https://images.unsplash.com/photo-1476673160081-cf065607f449?w=600&q=80", synopsis: "A small coastal town keeps its secrets beneath the tide line.", episodes: 8 },
  { id: "afterlight", slug: "afterlight", title: "Afterlight", kind: "show", year: 2022, rating: 8.3, genres: ["Sci-Fi", "Drama"], backdrop: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1400&q=80", poster: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80", synopsis: "Years after the sun goes quiet, a crew searches for the last warm place on Earth.", episodes: 10 },
];

export const countries = [...new Set(channels.map((channel) => channel.country))];
export const categories = [...new Set(channels.map((channel) => channel.category))];
export function findChannel(id: string) { return channels.find((channel) => channel.id === id); }
export function findEntertainment(slug: string) { return entertainment.find((item) => item.slug === slug); }
