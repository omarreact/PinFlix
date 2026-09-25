import type { ChannelPreview } from "@/src/types/catalog";
import { getIptvOrgChannel, getIptvOrgChannels, resolveIptvOrgChannel } from "./iptv-org";
import { getMangoChannels, resolveMangoChannel } from "./mango";
import { getRoarZoneChannels, resolveRoarZoneChannel, roarZoneRequestHeaders } from "./roarzone";
import type { LiveProviderId, ProviderChannel, ResolvedLiveStream } from "./types";

export * from "./types";
export { assertPublicNetworkUrl } from "./network";

export async function getLiveProviderChannels(): Promise<ProviderChannel[]> {
  const results = await Promise.allSettled([
    getIptvOrgChannels(),
    getRoarZoneChannels(),
    getMangoChannels(),
  ]);

  const channels: ProviderChannel[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") channels.push(...result.value);
  }
  return channels;
}

/** Public channels only — safe for Vercel playback. */
export async function getPublicLiveChannels(): Promise<ProviderChannel[]> {
  const all = await getLiveProviderChannels();
  return all.filter((c) => c.networkScope === "public" && c.availability !== "offline");
}

export async function getLiveProviderChannel(id: string): Promise<ProviderChannel | null> {
  if (id.startsWith("org-")) {
    return getIptvOrgChannel(id);
  }
  if (id.startsWith("rz-")) {
    const channels = await getRoarZoneChannels().catch(() => []);
    return channels.find((channel) => channel.id === id) ?? null;
  }
  if (id.startsWith("mango-")) {
    const channels = await getMangoChannels().catch(() => []);
    return channels.find((channel) => channel.id === id) ?? null;
  }
  return null;
}

export async function resolveLiveProviderChannel(id: string): Promise<ResolvedLiveStream | null> {
  if (id.startsWith("org-")) return resolveIptvOrgChannel(id);
  if (id.startsWith("rz-")) return resolveRoarZoneChannel(id);
  if (id.startsWith("mango-")) return resolveMangoChannel(id);
  return null;
}

export function toPublicChannel(channel: ProviderChannel): ChannelPreview {
  return {
    id: channel.id,
    name: channel.name,
    country: channel.country,
    countryCode: channel.countryCode,
    category: channel.category,
    groups: channel.groups,
    logo: channel.logo,
    description: channel.description,
    accent: channel.accent,
    isLive: channel.isLive,
    quality: channel.quality,
    availability: channel.availability,
    geoFlags: channel.geoFlags,
    epg: channel.epg,
    provider: channel.provider,
    networkScope: channel.networkScope,
  };
}

export function providerFromChannelId(id: string): LiveProviderId | null {
  if (id.startsWith("org-")) return "iptvorg";
  if (id.startsWith("rz-")) return "roarzone";
  if (id.startsWith("mango-")) return "mango";
  return null;
}

export function liveProviderHeaders(provider: LiveProviderId) {
  if (provider === "roarzone") return { ...roarZoneRequestHeaders };
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };
}

export async function getLiveProviderHealth() {
  const [org, roar, mango] = await Promise.allSettled([
    getIptvOrgChannels(),
    getRoarZoneChannels(),
    getMangoChannels(),
  ]);

  const summarize = (result: PromiseSettledResult<ProviderChannel[]>) =>
    result.status === "fulfilled"
      ? {
          ok: true,
          channels: result.value.length,
          public: result.value.filter((item) => item.networkScope === "public").length,
          local: result.value.filter((item) => item.networkScope === "local").length,
        }
      : { ok: false, channels: 0, public: 0, local: 0 };

  return {
    iptvorg: summarize(org),
    roarzone: summarize(roar),
    mango: summarize(mango),
  };
}
