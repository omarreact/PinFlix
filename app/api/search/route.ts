import { channels, entertainment as staticEntertainment } from "@/src/lib/iptv/catalog";
import * as cineplexbd from "@/src/lib/providers/cineplexbd";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") || "";
  const normalized = query.trim().toLowerCase();

  const foundChannels = normalized ? channels.filter((channel) => 
    `${channel.name} ${channel.country} ${channel.category}`.toLowerCase().includes(normalized)
  ) : [];

  const foundStaticEntertainment = normalized ? staticEntertainment.filter((item) => 
    `${item.title} ${item.genres.join(" ")}`.toLowerCase().includes(normalized)
  ) : [];

  let cineplexResults: any[] = [];
  if (normalized) {
    cineplexResults = await cineplexbd.search(normalized);
  } else {
    // Maybe get popular if no query? Let's just return empty.
    cineplexResults = [];
  }

  // Deduplicate just in case
  const allEntertainment = [...foundStaticEntertainment, ...cineplexResults];

  return Response.json({
    channels: foundChannels,
    entertainment: allEntertainment
  });
}
