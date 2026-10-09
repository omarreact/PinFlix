import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { cleanMediaName, parseDirectory } from "../src/lib/ingest/directory";

const prisma = new PrismaClient();
const root = process.env.CINEPLEX_DIRECTORY_URL ?? "http://cds3.cineplexbd.net/index.php";
const origin = new URL(root);
if (!['http:', 'https:'].includes(origin.protocol) || origin.hostname !== 'cds3.cineplexbd.net' || origin.username || origin.password || origin.port) throw new Error('Use the configured CineplexBD directory origin.');
const limit = Math.min(1000, Math.max(1, Number(process.env.INGEST_MAX_PAGES) || 100));
const queue = [root];
const visited = new Set<string>();
const token = process.env.TMDB_READ_ACCESS_TOKEN;
const apiKey = process.env.TMDB_API_KEY;

async function metadata(name: string, year: number | undefined, kind: string) {
  if (!token && !apiKey) return null;
  const url = new URL(`https://api.themoviedb.org/3/search/${kind}`);
  url.searchParams.set('query', name);
  if (year) url.searchParams.set(kind === 'tv' ? 'first_air_date_year' : 'year', String(year));
  if (!token && apiKey) url.searchParams.set('api_key', apiKey);
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const data = await response.json() as { results?: Array<{ title?: string; name?: string; overview?: string; poster_path?: string; backdrop_path?: string; vote_average?: number }> };
  return data.results?.find((item) => (item.title ?? item.name)?.toLowerCase() === name.toLowerCase()) ?? null;
}

let imported = 0;
let failures = 0;
try {
  while (queue.length && visited.size < limit) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    try {
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const entries = parseDirectory(await response.text(), url, root);
      queue.push(...entries.filter((entry) => entry.kind === 'directory' && !visited.has(entry.url) && !queue.includes(entry.url)).slice(0, Math.max(0, limit - visited.size - queue.length)).map((entry) => entry.url));
      for (const video of entries.filter((entry) => entry.kind === 'video')) {
        const parsed = cleanMediaName(video.filename);
        const series = parsed.episode !== undefined;
        const slug = `bdix-${createHash('sha256').update(`${parsed.title}-${parsed.year ?? ''}-${series}`).digest('hex').slice(0, 20)}`;
        const existing = await prisma.title.findUnique({ where: { slug } });
        // A takedown remains effective on subsequent automated imports.
        if (existing?.status === 'ARCHIVED') continue;
        const meta = await metadata(parsed.title, parsed.year, series ? 'tv' : 'movie').catch(() => null);
        const data = {
          name: meta?.title ?? meta?.name ?? parsed.title, type: series ? 'SERIES' : 'MOVIE', overview: meta?.overview ?? 'Imported from the configured CineplexBD media directory.',
          releaseYear: parsed.year, posterPath: meta?.poster_path ? `https://image.tmdb.org/t/p/w500${meta.poster_path}` : '/posters/big-buck-bunny.svg',
          backdropPath: meta?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${meta.backdrop_path}` : '/backdrops/big-buck-bunny.svg',
          rating: meta?.vote_average,
        };
        const title = await prisma.title.upsert({ where: { slug }, update: data, create: { slug, ...data, status: 'PUBLISHED', publishedAt: new Date() } });
        let episodeId: string | undefined;
        if (series) {
          const season = await prisma.season.upsert({ where: { titleId_number: { titleId: title.id, number: parsed.season ?? 1 } }, update: {}, create: { titleId: title.id, number: parsed.season ?? 1 } });
          const episode = await prisma.episode.upsert({ where: { seasonId_number: { seasonId: season.id, number: parsed.episode! } }, update: {}, create: { seasonId: season.id, number: parsed.episode!, name: `Episode ${parsed.episode}` } });
          episodeId = episode.id;
        }
        const owner = episodeId ? { episodeId } : { titleId: title.id };
        const source = await prisma.streamSource.findFirst({ where: { ...owner, url: video.url } });
        if (!source) await prisma.streamSource.create({ data: { ...owner, url: video.url, label: video.filename, protocol: /\.m3u8$/i.test(new URL(video.url).pathname) ? 'HLS' : 'MP4', qualityLabel: video.filename.match(/\d{3,4}p/i)?.[0] ?? 'Original', priority: Number(video.filename.match(/(\d{3,4})p/i)?.[1]) || 1 } });
        for (const subtitle of entries.filter((entry) => entry.kind === 'subtitle' && entry.filename.replace(/\.(srt|vtt)$/i, '').startsWith(video.filename.replace(/\.(mp4|webm|m3u8)$/i, '')))) {
          if (!await prisma.subtitleTrack.findFirst({ where: { ...owner, url: subtitle.url } })) await prisma.subtitleTrack.create({ data: { ...owner, url: subtitle.url, language: 'en', label: 'English', format: /\.vtt$/i.test(subtitle.filename) ? 'VTT' : 'SRT' } });
        }
        imported++;
      }
    } catch (error) {
      failures++;
      console.error('Directory unavailable:', new URL(url).pathname, error instanceof Error ? error.message : 'Network error');
    }
  }
  console.log(JSON.stringify({ pages: visited.size, imported, failures, remaining: queue.length }));
  if (failures && !imported) process.exitCode = 1;
} finally { await prisma.$disconnect(); }
