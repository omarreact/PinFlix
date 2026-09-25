type HealthAggregate = { attempts: number; successes: number; consecutiveFailures: number; latencyEwmaMs?: number };
const health = new Map<string, HealthAggregate>();

export function recordSourceResult(sourceKey: string, success: boolean, latencyMs?: number) {
  const current = health.get(sourceKey) ?? { attempts: 0, successes: 0, consecutiveFailures: 0 };
  const attempts = current.attempts + 1;
  const latencyEwmaMs = latencyMs === undefined ? current.latencyEwmaMs : current.latencyEwmaMs === undefined ? latencyMs : current.latencyEwmaMs * 0.8 + latencyMs * 0.2;
  health.set(sourceKey, { attempts, successes: current.successes + (success ? 1 : 0), consecutiveFailures: success ? 0 : current.consecutiveFailures + 1, latencyEwmaMs });
}

export function getHealthAggregates() {
  return [...health.entries()].map(([sourceKey, value]) => ({ sourceKey, successRatio: value.attempts ? value.successes / value.attempts : 0, consecutiveFailures: value.consecutiveFailures, latencyEwmaMs: value.latencyEwmaMs }));
}

export function getSourceScore(sourceKey: string) {
  const current = health.get(sourceKey);
  if (!current || current.attempts === 0) return 0.5;
  const successRatio = current.successes / current.attempts;
  const failurePenalty = Math.min(current.consecutiveFailures * 0.1, 0.4);
  const latencyPenalty = current.latencyEwmaMs ? Math.min(current.latencyEwmaMs / 10000, 0.2) : 0;
  return successRatio - failurePenalty - latencyPenalty;
}
