import { inferStreamProtocol } from "./network";
import type { ProviderChannel, ResolvedLiveStream } from "./types";

const API_BASE = "https://iptv-org.github.io/api";
const REVALIDATE = 3600;

type OrgChannel = {
  id: string;
  name: string;
  country?: string;
  categories?: string[];
  is_nsfw?: boolean;
  logo?: string | null;
};

type OrgStream = {
  channel?: string | null;
  url: string;
  quality?: string | null;
};

type OrgCountry = {
  code: string;
  name: string;
};

/** Preferred Bangladesh channel ids from iptv-org (public FTA metadata). */
const BD_PREFERRED = [
  "BTVNational.bd", "BTVWorld.bd", "BTVNews.bd", "SangsadTV.bd", "ChannelI.bd",
  "ATNBangla.bd", "NTV.bd", "RTV.bd", "BanglaVision.bd", "EkusheyTV.bd",
  "BoishakhiTV.bd", "MaasrangaTV.bd", "GaziTV.bd", "DeeptoTV.bd", "DeshTV.bd",
  "TSports.bd", "ATNNews.bd", "Channel24.bd", "DBCNews.bd", "EkattorTV.bd",
  "IndependentTV.bd", "JamunaTV.bd", "News24.bd", "SomoyNewsTV.bd", "ChannelS.bd",
  "GaanBangla.bd", "DurontoTV.bd",
] as const;

/** Preferred international news / public channels that often have public streams. */
const INTL_PREFERRED = [
  "BBCNews.uk", "AlJazeera.qa", "DWEnglish.de", "France24English.fr", "EuronewsEnglish.fr",
  "CNBC.uk", "BloombergTV.us", "NASA TV Public.us", "C-SPAN.us", "NHKWorldJapan.jp",
  "ArirangTV.kr", "WION.in", "DDIndia.in", "ABPNews.in", "TimesNow.in",
] as const;

const ACCENTS = ["#5eead4", "#a78bfa", "#fbbf24", "#fb7185", "#86efac", "#38bdf8", "#f472b6"];

function channelId(orgId: string) {
  return `org-${orgId}`;
}

function parseOrgId(id: string): string | null {
  if (!id.startsWith("org-")) return null;
  return id.slice(4);
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}/${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: REVALIDATE },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`iptv-org ${path} HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function pickAccent(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 1)) % ACCENTS.length;
  return ACCENTS[hash] ?? ACCENTS[0];
}

function countryName(code: string | undefined, countries: Map<string, string>) {
  if (!code) return "International";
  return countries.get(code.toUpperCase()) ?? code.toUpperCase();
}

function categoryLabel(categories: string[] | undefined) {
  const first = categories?.[0];
  if (!first) return "Live TV";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export async function getIptvOrgChannels(): Promise<ProviderChannel[]> {
  try {
    const [rawChannels, rawStreams, rawCountries] = await Promise.all([
      fetchJson<OrgChannel[]>("channels.json"),
      fetchJson<OrgStream[]>("streams.json"),
      fetchJson<OrgCountry[]>("countries.json").catch(() => [] as OrgCountry[]),
    ]);

    const countries = new Map(rawCountries.map((c) => [c.code.toUpperCase(), c.name]));
    const streamsByChannel = new Map<string, OrgStream[]>();
    for (const stream of rawStreams) {
      if (!stream.channel || !stream.url) continue;
      const list = streamsByChannel.get(stream.channel) ?? [];
      list.push(stream);
      streamsByChannel.set(stream.channel, list);
    }

    const byId = new Map(rawChannels.filter((c) => !c.is_nsfw).map((c) => [c.id, c]));
    const selected: OrgChannel[] = [];
    const seen = new Set<string>();

    const take = (ids: readonly string[], max: number) => {
      for (const id of ids) {
        if (selected.length >= max) break;
        const ch = byId.get(id);
        if (!ch || seen.has(ch.id)) continue;
        // Prefer channels that currently have at least one public stream
        if (!streamsByChannel.has(ch.id)) continue;
        seen.add(ch.id);
        selected.push(ch);
      }
    };

    take(BD_PREFERRED, 30);

    // Fill remaining BD slots from any BD channel with streams
    if (selected.filter((c) => c.country === "BD").length < 25) {
      for (const ch of rawChannels) {
        if (selected.length >= 40) break;
        if (ch.is_nsfw || ch.country !== "BD" || seen.has(ch.id)) continue;
        if (!streamsByChannel.has(ch.id)) continue;
        seen.add(ch.id);
        selected.push(ch);
      }
    }

    take(INTL_PREFERRED, selected.length + 40);

    // Fill with more public news/documentary streams if needed
    if (selected.length < 80) {
      for (const ch of rawChannels) {
        if (selected.length >= 100) break;
        if (ch.is_nsfw || seen.has(ch.id)) continue;
        const cats = ch.categories ?? [];
        if (!cats.some((c) => ["news", "public", "documentary", "business", "science"].includes(c))) continue;
        if (!streamsByChannel.has(ch.id)) continue;
        seen.add(ch.id);
        selected.push(ch);
      }
    }

    return selected.map((ch) => {
      const streams = streamsByChannel.get(ch.id) ?? [];
      const primary = streams[0];
      const category = categoryLabel(ch.categories);
      const code = (ch.country ?? "INT").toUpperCase();
      return {
        id: channelId(ch.id),
        provider: "iptvorg" as const,
        networkScope: "public" as const,
        sourceKey: ch.id,
        sourceUrl: primary?.url,
        streamProtocol: primary ? inferStreamProtocol(primary.url) : undefined,
        name: ch.name,
        country: countryName(ch.country, countries),
        countryCode: code.toLowerCase(),
        category,
        groups: [...new Set([category, "iptv-org", code])],
        logo: ch.logo || "📺",
        description: `Public live stream via iptv-org · ${category}`,
        accent: pickAccent(ch.id),
        isLive: true,
        quality: primary?.quality || "Live",
        availability: primary ? ("available" as const) : ("limited" as const),
      };
    });
  } catch (error) {
    console.error("iptv-org catalog failed", error);
    return [];
  }
}

export async function getIptvOrgChannel(id: string): Promise<ProviderChannel | null> {
  const channels = await getIptvOrgChannels();
  return channels.find((c) => c.id === id) ?? null;
}

export async function resolveIptvOrgChannel(id: string): Promise<ResolvedLiveStream | null> {
  const orgId = parseOrgId(id);
  if (!orgId) return null;

  try {
    const streams = await fetchJson<OrgStream[]>("streams.json");
    const matches = streams.filter((s) => s.channel === orgId && s.url);
    const primary = matches[0];
    if (!primary) return null;

    return {
      provider: "iptvorg",
      channelId: id,
      upstreamUrl: primary.url,
      protocol: inferStreamProtocol(primary.url),
      quality: primary.quality || "Live",
      networkScope: "public",
    };
  } catch (error) {
    console.error("iptv-org resolve failed", error);
    return null;
  }
}
