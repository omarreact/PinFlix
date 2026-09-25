import type { Channel, StreamSource } from "@/src/types/catalog";
import { channels } from "@/src/lib/iptv/catalog";
import { getSourceScore } from "@/src/lib/iptv/health";

const demoSource: StreamSource = { url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", quality: "Auto", protocol: "hls", priority: 1 };
const sourcesByChannel: Record<string, StreamSource[]> = Object.fromEntries(channels.map((channel) => [channel.id, [
  demoSource,
  { ...demoSource, quality: "Backup", priority: 2 },
]]));

export function resolveChannel(id: string): Channel | undefined {
  const preview = channels.find((channel) => channel.id === id);
  if (!preview) return undefined;
  const streams = [...(sourcesByChannel[id] ?? [])]
    .map((source, index) => ({ source, index }))
    .sort((a, b) => (getSourceScore(`${id}:${b.index}`) - getSourceScore(`${id}:${a.index}`)) || (a.source.priority - b.source.priority))
    .map(({ source }) => source);
  return { ...preview, streams };
}

export function getChannelSource(id: string, index: number) {
  const sources = sourcesByChannel[id] ?? [];
  return sources[index];
}

export function getRankedChannelSources(id: string) {
  return [...(sourcesByChannel[id] ?? [])]
    .map((source, sourceIndex) => ({ source, sourceIndex }))
    .sort((a, b) => (getSourceScore(`${id}:${b.sourceIndex}`) - getSourceScore(`${id}:${a.sourceIndex}`)) || (a.source.priority - b.source.priority));
}
