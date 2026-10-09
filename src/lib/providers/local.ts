import { prisma } from "@/src/lib/db";
import type { PinFlixProvider } from "./contracts";
import type { Entertainment } from "@/src/types/catalog";

async function titles(kind?: "movie" | "show", query?: string) {
  const rows = await prisma.title.findMany({
    where: { status: "PUBLISHED", ...(kind ? { type: kind === "show" ? "SERIES" : "MOVIE" } : {}), ...(query ? { name: { contains: query } } : {}) },
    include: { genres: { include: { genre: true } } },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map((row): Entertainment => ({
    id: `local-${row.id}`, slug: `local-${row.id}`, title: row.name,
    kind: row.type === "SERIES" ? "show" : "movie", synopsis: row.overview,
    poster: row.posterPath, backdrop: row.backdropPath, year: row.releaseYear ?? undefined,
    rating: row.rating ?? undefined, genres: row.genres.map(({ genre }) => genre.name),
    provider: row.slug.endsWith("-demo") ? "demo" : "cineplexbd",
  }));
}

export const localProvider: PinFlixProvider = {
  name: "local",
  canHandleId: (id) => /^local-[a-zA-Z0-9_-]+$/.test(id),
  search: (query) => titles(undefined, query.trim()),
  async getLatestPage(kind, page = 1) {
    const items = await titles(kind);
    return { items: items.slice((page - 1) * 28, page * 28), page, hasNextPage: items.length > page * 28 };
  },
  async getCategories() { return []; },
  async getCategoryPage() { return null; },
  async getDetails(id) { return (await titles()).find((item) => item.id === id) ?? null; },
  async getSeriesNavigation(id, requestedSeason = 1) {
    const seasons = await prisma.season.findMany({ where: { titleId: id.slice(6), title: { status: "PUBLISHED" } }, include: { episodes: true }, orderBy: { number: "asc" } });
    const selected = seasons.find((season) => season.number === requestedSeason) ?? seasons[0];
    return { seasons: seasons.map((season) => season.number), season: selected?.number ?? 1, episodes: selected?.episodes.length ?? 1 };
  },
  async resolveStreams(id, options = {}) {
    const title = await prisma.title.findFirst({ where: { id: id.slice(6), status: "PUBLISHED" } });
    if (!title) return [];
    const episode = title.type === "SERIES" ? await prisma.episode.findFirst({ where: { number: options.episode ?? 1, season: { titleId: title.id, number: options.season ?? 1 } } }) : null;
    if (title.type === "SERIES" && !episode) return [];
    const where = episode ? { episodeId: episode.id } : { titleId: title.id };
    const [streams, subtitles] = await Promise.all([
      prisma.streamSource.findMany({ where: { ...where, isActive: true, requiresSubscription: false }, orderBy: { priority: "desc" } }),
      prisma.subtitleTrack.findMany({ where }),
    ]);
    return streams.map((source) => ({
      url: source.url.startsWith("http://") && new URL(source.url).hostname.endsWith(".cineplexbd.net") ? `/api/proxy-video?url=${encodeURIComponent(source.url)}` : source.url,
      quality: source.qualityLabel, protocol: source.protocol === "HLS" ? "hls" as const : "native" as const,
      priority: source.priority, subtitles: subtitles.map((track) => ({ label: track.label, language: track.language, url: track.url.startsWith("http://") ? `/api/proxy-video?url=${encodeURIComponent(track.url)}` : track.url })),
    }));
  },
};
