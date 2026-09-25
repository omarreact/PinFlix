import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { inferStreamProtocol, literalNetworkScope } from "./network";
import type { ProviderChannel, ResolvedLiveStream } from "./types";

const BASE_URL = "https://tv.roarzone.net";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: `${BASE_URL}/`,
};

function channelId(sourceKey: string) {
  return `rz-${createHash("sha256").update(sourceKey).digest("hex").slice(0, 16)}`;
}

function absoluteUrl(value: string) {
  return new URL(value, BASE_URL).toString();
}

export async function getRoarZoneChannels(): Promise<ProviderChannel[]> {
  const response = await fetch(BASE_URL, {
    headers: HEADERS,
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`RoarZone catalog returned HTTP ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const channels: ProviderChannel[] = [];

  $(".channel-card").each((_, element) => {
    const card = $(element);
    const sourceKey = card.attr("data-stream")?.trim();
    const name = card.attr("data-title")?.trim() || card.find("img").attr("alt")?.trim();
    if (!sourceKey || !name) return;

    const rawLogo = card.find("img").first().attr("src")?.trim();
    const logo = rawLogo ? absoluteUrl(rawLogo) : "📺";
    const rawTags = card.attr("data-tags")?.trim() || "";
    const tags = rawTags.split(/[|,]/).map((item) => item.trim()).filter(Boolean);
    const category = tags[0] || "Live TV";

    channels.push({
      id: channelId(sourceKey),
      provider: "roarzone",
      networkScope: "public",
      sourceKey,
      name,
      country: "Bangladesh",
      countryCode: "bd",
      category,
      groups: [...new Set([category, "RoarZone"])],
      logo,
      description: `Live channel from RoarZone · ${category}`,
      accent: "#5eead4",
      isLive: true,
      quality: "Live",
      availability: "available",
    });
  });

  return channels.filter((channel, index, list) => list.findIndex((item) => item.id === channel.id) === index);
}

export async function resolveRoarZoneChannel(id: string): Promise<ResolvedLiveStream | null> {
  const channels = await getRoarZoneChannels();
  const channel = channels.find((item) => item.id === id);
  if (!channel) return null;

  const playerUrl = new URL("/player.php", BASE_URL);
  playerUrl.searchParams.set("stream", channel.sourceKey);

  const response = await fetch(playerUrl, {
    headers: HEADERS,
    next: { revalidate: 120 },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`RoarZone player returned HTTP ${response.status}`);

  const html = await response.text();
  const hlsMatch = html.match(/hls\.loadSource\(\s*['"]([^'"]+)['"]\s*\)/i);
  const sourceMatch = html.match(/<source[^>]+src=['"]([^'"]+)['"]/i);
  const rawUrl = hlsMatch?.[1] || sourceMatch?.[1];
  if (!rawUrl) throw new Error("RoarZone stream URL was not found in the player page.");

  const upstreamUrl = absoluteUrl(rawUrl);
  return {
    provider: "roarzone",
    channelId: id,
    upstreamUrl,
    protocol: inferStreamProtocol(upstreamUrl),
    quality: "Live",
    networkScope: literalNetworkScope(upstreamUrl),
  };
}

export const roarZoneRequestHeaders = HEADERS;
