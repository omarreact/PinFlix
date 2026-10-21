import "server-only";
const values = new Map<string, { expires: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
export async function cached<T>(key: string, ttl: number, run: () => Promise<T>): Promise<T> {
  const hit = values.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const active = pending.get(key);
  if (active) return active as Promise<T>;
  if (pending.size >= 64) throw new Error('Too many concurrent catalog requests');
  const promise = run().then(value => {
    if (values.size >= 250) values.delete(values.keys().next().value!);
    values.set(key, {value, expires: Date.now() + ttl});
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}
export function clearCache() { values.clear(); pending.clear(); }
