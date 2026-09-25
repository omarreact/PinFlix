import { channels as demoChannels, entertainment as staticEntertainment } from "@/src/lib/iptv/catalog";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";
import * as tmdb from "@/src/lib/providers/tmdb";
import { getLiveProviderChannels, toPublicChannel } from "@/src/lib/providers/live-tv";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") || "";
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return Response.json({ channels: [], entertainment: [] });
  }

  const [providerChannels, cineplexResults, tmdbResults] = await Promise.all([
    getLiveProviderChannels(),
    cineplexbd.search(normalized),
    tmdb.search(normalized),
  ]);

  const allChannels = [
    ...providerChannels.map(toPublicChannel),
    ...demoChannels,
  ];

  const foundChannels = allChannels.filter((channel) =>
    `${channel.name} ${channel.country} ${channel.category} ${channel.provider ?? ""}`
      .toLowerCase()
      .includes(normalized),
  );

  const foundStaticEntertainment = staticEntertainment.filter((item) =>
    `${item.title} ${item.genres.join(" ")}`.toLowerCase().includes(normalized),
  );

  const seen = new Set<string>();
  const entertainment = [...foundStaticEntertainment, ...tmdbResults, ...cineplexResults].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return Response.json({
    channels: foundChannels,
    entertainment,
  });
}
