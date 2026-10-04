import "server-only";

import type { Entertainment } from "@/src/types/catalog";
import type { PinFlixProvider, ProviderKind } from "./contracts";

export type PlaybackMatchInput = {
  title: string;
  aliases?: string[];
  kind: ProviderKind;
  year?: number;
};

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalTitle(value: string) {
  return normalizeTitle(value)
    .replace(/\b(?:19|20)\d{2}\b/g, " ")
    .replace(/\b(?:2160p|1080p|720p|480p|4k|uhd|hdr|webrip|webdl|web dl|bluray|blu ray|brrip|hdrip|x264|x265|h264|h265|hevc|aac)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: string) {
  return canonicalTitle(value).replace(/\s+/g, "");
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function tokenStats(left: string, right: string) {
  const leftTokens = new Set(canonicalTitle(left).split(" ").filter(Boolean));
  const rightTokens = new Set(canonicalTitle(right).split(" ").filter(Boolean));

  if (!leftTokens.size || !rightTokens.size) {
    return { jaccard: 0, targetCoverage: 0, candidateCoverage: 0 };
  }

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return {
    jaccard: intersection / union,
    targetCoverage: intersection / leftTokens.size,
    candidateCoverage: intersection / rightTokens.size,
  };
}

function titleScore(targets: string[], candidate: string) {
  let best = 0;

  for (const target of targets) {
    const normalizedTarget = canonicalTitle(target);
    const normalizedCandidate = canonicalTitle(candidate);
    if (!normalizedTarget || !normalizedCandidate) continue;

    if (normalizedTarget === normalizedCandidate) {
      best = Math.max(best, 120);
      continue;
    }

    if (compact(target) === compact(candidate)) {
      best = Math.max(best, 118);
      continue;
    }

    const stats = tokenStats(target, candidate);
    if (stats.jaccard >= 0.9) {
      best = Math.max(best, 110);
    } else if (
      stats.targetCoverage === 1 &&
      stats.candidateCoverage >= 0.72
    ) {
      best = Math.max(best, 104);
    } else if (stats.jaccard >= 0.78) {
      best = Math.max(best, 98);
    }

    const shorter = Math.min(normalizedTarget.length, normalizedCandidate.length);
    const longer = Math.max(normalizedTarget.length, normalizedCandidate.length);
    if (
      shorter >= 8 &&
      longer > 0 &&
      shorter / longer >= 0.82 &&
      (normalizedTarget.startsWith(normalizedCandidate) ||
        normalizedCandidate.startsWith(normalizedTarget))
    ) {
      best = Math.max(best, 96);
    }
  }

  return best;
}

function yearAdjustment(targetYear: number | undefined, candidateYear: number | undefined) {
  if (!targetYear || !candidateYear) return 0;

  const difference = Math.abs(targetYear - candidateYear);
  if (difference === 0) return 10;
  if (difference === 1) return 2;
  return -35;
}

function buildQueries(input: PlaybackMatchInput) {
  const aliases = unique([input.title, ...(input.aliases ?? [])]);
  const simplified = aliases.flatMap((value) => {
    const canonical = canonicalTitle(value);
    const punctuationFree = value
      .replace(/[:|–—-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const beforeSubtitle = value.split(/[:|–—]/, 1)[0]?.trim();

    return [
      value,
      punctuationFree !== value ? punctuationFree : undefined,
      canonical && canonical !== normalizeTitle(value) ? canonical : undefined,
      beforeSubtitle && beforeSubtitle.length >= 4 && beforeSubtitle !== value
        ? beforeSubtitle
        : undefined,
    ];
  });

  return unique(simplified).slice(0, 6);
}

export async function findPlayableMatch(
  provider: PinFlixProvider,
  input: PlaybackMatchInput,
): Promise<Entertainment | undefined> {
  const targets = unique([input.title, ...(input.aliases ?? [])]);
  const candidates = new Map<string, Entertainment>();

  for (const query of buildQueries(input)) {
    try {
      const results = await provider.search(query, 1);
      for (const candidate of results) {
        if (candidate.kind === input.kind) candidates.set(candidate.id, candidate);
      }
    } catch {
      // Keep trying the remaining normalized queries. One provider search
      // failure should not make a TMDB detail page fail.
    }
  }

  let best:
    | {
        item: Entertainment;
        score: number;
      }
    | undefined;

  for (const candidate of candidates.values()) {
    const score =
      titleScore(targets, candidate.title) +
      yearAdjustment(input.year, candidate.year);

    if (!best || score > best.score) {
      best = { item: candidate, score };
    }
  }

  // Keep the threshold intentionally strict. A missing Play button is safer
  // than linking a TMDB title to the wrong provider item.
  return best && best.score >= 96 ? best.item : undefined;
}
