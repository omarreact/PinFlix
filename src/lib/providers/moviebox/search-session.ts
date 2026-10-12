import { createHash } from "node:crypto";

const HOME =
  "https://h5-api.aoneroom.com/wefeed-h5api-bff/home?host=movibox.net&channel=1";
const SESSION_TTL_MS = 5 * 60_000;
type Session = { token: string; expiresAt: number };
let session: Session | undefined;
let pending: Promise<Session> | undefined;

/** Anonymous client handshake used by the provider's public website. The
 * timestamp checksum identifies a guest client; it is not a user credential.
 * Search uses the session issued in x-user, never a copied website cookie.
 */
async function createSession(): Promise<Session> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const checksum = createHash("md5")
    .update(timestamp.split("").reverse().join(""))
    .digest("hex");
  const response = await fetch(HOME, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Client-Token": `${timestamp},${checksum}`,
      "X-Client-Info": JSON.stringify({ timezone: "UTC" }),
      "X-Request-Lang": "en",
      Origin: "https://movibox.net",
      Referer: "https://movibox.net/",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    },
  });
  try {
    if (!response.ok)
      throw new Error(
        `Provider guest session returned HTTP ${response.status}`,
      );
    const issued = response.headers.get("x-user");
    if (!issued || issued.length > 16_384)
      throw new Error("Provider did not issue a guest search session");
    let token: unknown;
    try {
      token = (JSON.parse(issued) as { token?: unknown }).token;
    } catch {
      throw new Error("Provider issued an invalid guest session envelope");
    }
    if (typeof token !== "string" || !token || /[\r\n]/.test(token))
      throw new Error("Provider issued an invalid guest search session");
    return { token, expiresAt: Date.now() + SESSION_TTL_MS };
  } finally {
    await response.body?.cancel();
  }
}

export async function getSearchSession(signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  if (session && session.expiresAt > Date.now()) return session.token;
  // Bootstrap has its own deadline: one cancelled caller must not cancel the
  // shared handshake for other concurrent search requests.
  pending ??= createSession()
    .then((value) => {
      session = value;
      return value;
    })
    .finally(() => {
      pending = undefined;
    });
  return new Promise<string>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    pending!
      .then((value) => resolve(value.token), reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

export function invalidateSearchSession(token: string) {
  // A delayed rejection of an old session must not evict its replacement.
  if (session?.token === token) session = undefined;
}
