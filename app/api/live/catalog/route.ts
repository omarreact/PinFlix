import { getLiveProviderChannels, toPublicChannel } from "@/src/lib/providers/live-tv";

export async function GET() {
  const channels = await getLiveProviderChannels().catch(() => []);
  const publicChannels = channels.filter((channel) => channel.networkScope === "public");
  const localChannels = channels.filter((channel) => channel.networkScope === "local");

  return Response.json({
    counts: {
      total: channels.length,
      public: publicChannels.length,
      local: localChannels.length,
      iptvorg: channels.filter((channel) => channel.provider === "iptvorg").length,
      roarzone: channels.filter((channel) => channel.provider === "roarzone").length,
      mango: channels.filter((channel) => channel.provider === "mango").length,
    },
    channels: channels.map(toPublicChannel),
  });
}
