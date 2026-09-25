import { lookup } from "node:dns/promises";
import net from "node:net";
import type { StreamProtocol } from "@/src/types/catalog";
import type { LiveNetworkScope } from "./types";

export function inferStreamProtocol(url: string): StreamProtocol {
  const lower = url.toLowerCase();
  if (lower.includes(".m3u8") || lower.includes("mpegurl")) return "hls";
  if (lower.includes(".ts")) return "mpegts";
  return "native";
}

export function literalNetworkScope(rawUrl: string): LiveNetworkScope {
  try {
    const parsed = new URL(rawUrl);
    return isBlockedHostOrAddress(parsed.hostname) ? "local" : "public";
  } catch {
    return "local";
  }
}

export async function assertPublicNetworkUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS live streams are allowed.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isBlockedHostOrAddress(hostname)) {
    throw new Error("LOCAL_NETWORK_ONLY");
  }

  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length) throw new Error("Unable to resolve live stream host.");
  if (addresses.some(({ address }) => isBlockedHostOrAddress(address))) {
    throw new Error("LOCAL_NETWORK_ONLY");
  }
}

function isBlockedHostOrAddress(value: string) {
  const normalized = value.toLowerCase().replace(/^\[|\]$/g, "");
  if (!normalized || normalized === "localhost" || normalized === "::1") return true;

  if (net.isIPv4(normalized)) {
    const [a, b] = normalized.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  if (net.isIPv6(normalized)) {
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
  }

  return false;
}
