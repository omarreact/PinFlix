import { channels as demoChannels, entertainment as staticEntertainment } from "@/src/lib/iptv/catalog";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";
import { getLiveProviderChannels, toPublicChannel } from "@/src/lib/providers/live-tv";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") || "";
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return Response.json({ channels: [], entertainment: [] });
  }

  const [providerChannels, cineplexResults] = await Promise.all([
    getLiveProviderChannels(),
    cineplexbd.search(normalized),
  ]);

  const allChannels = [
    ...providerChannels.map(toPublicChannel),
    ...demoChannels,
  ];

  const foundChannels = allChannels.filter((channel) =>
    `${channel.name} ${channel.country} ${channel.category} ${channel.provider ?? ""}`
      .toLowerCase()
      .includes(normalized)
  );

  const foundStaticEntertainment = staticEntertainment.filter((item) =>
    `${item.title} ${item.genres.join(" ")}`.toLowerCase().includes(normalized)
  );

  return Response.json({
    channels: foundChannels,
    entertainment: [...foundStaticEntertainment, ...cineplexResults],
  });
}
