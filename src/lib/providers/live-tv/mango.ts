import { createHash } from "node:crypto";
import { inferStreamProtocol, literalNetworkScope } from "./network";
import type { ProviderChannel, ResolvedLiveStream } from "./types";

const API_URL = "http://tv.mango.com.bd/tv-server";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json,text/plain,*/*",
};

type MangoEntry = {
  channel_name?: unknown;
  url?: unknown;
  image?: unknown;
};

function makeId(name: string, url: string) {
  return `mango-${createHash("sha256").update(`${name}|${url}`).digest("hex").slice(0, 16)}`;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function getMangoChannels(): Promise<ProviderChannel[]> {
  const response = await fetch(API_URL, {
    headers: HEADERS,
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Mango Live TV catalog returned HTTP ${response.status}`);

  const payload = await response.json() as unknown;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Mango Live TV returned an unexpected catalog payload.");
  }

  const channels: ProviderChannel[] = [];
  for (const [categoryName, rawList] of Object.entries(payload as Record<string, unknown>)) {
    if (!Array.isArray(rawList)) continue;

    for (const rawEntry of rawList) {
      if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) continue;
      const entry = rawEntry as MangoEntry;
      const name = asString(entry.channel_name);
      const sourceUrl = asString(entry.url);
      const logo = asString(entry.image);
      if (!name || !sourceUrl) continue;

      const networkScope = literalNetworkScope(sourceUrl);
      channels.push({
        id: makeId(name, sourceUrl),
        provider: "mango",
        networkScope,
        sourceKey: sourceUrl,
        sourceUrl,
        streamProtocol: inferStreamProtocol(sourceUrl),
        name,
        country: "Bangladesh",
        countryCode: "bd",
        category: categoryName || "Live TV",
        groups: [...new Set([categoryName || "Live TV", "Mango"])],
        logo: logo || "📡",
        description: `Live channel from Mango Live TV · ${categoryName || "Live TV"}`,
        accent: "#fbbf24",
        isLive: true,
        quality: networkScope === "local" ? "BDIX / Local" : "Live",
        availability: networkScope === "local" ? "limited" : "available",
      });
    }
  }

  return channels.filter((channel, index, list) =>
    list.findIndex((item) => item.id === channel.id) === index
  );
}

export async function resolveMangoChannel(id: string): Promise<ResolvedLiveStream | null> {
  const channels = await getMangoChannels();
  const channel = channels.find((item) => item.id === id);
  if (!channel?.sourceUrl) return null;

  return {
    provider: "mango",
    channelId: id,
    upstreamUrl: channel.sourceUrl,
    protocol: channel.streamProtocol || inferStreamProtocol(channel.sourceUrl),
    quality: channel.quality || "Live",
    networkScope: channel.networkScope,
  };
}
