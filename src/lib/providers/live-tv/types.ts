import type { ChannelPreview, StreamProtocol } from "@/src/types/catalog";

export type LiveNetworkScope = "public" | "local";

export type LiveProviderId = "roarzone" | "mango" | "iptvorg";

export type ProviderChannel = ChannelPreview & {
  provider: LiveProviderId;
  networkScope: LiveNetworkScope;
  sourceKey: string;
  sourceUrl?: string;
  streamProtocol?: StreamProtocol;
};

export type ResolvedLiveStream = {
  provider: LiveProviderId;
  channelId: string;
  upstreamUrl: string;
  protocol: StreamProtocol;
  quality: string;
  networkScope: LiveNetworkScope;
};
