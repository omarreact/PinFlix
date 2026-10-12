import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderSearchUnavailable, search, searchPage } from "./web";
import { getSearchSession, invalidateSearchSession } from "./search-session";
const loki = {
  subjectId: "123456789",
  detailPath: "loki-series-123",
  title: "Loki",
  subjectType: "2",
  releaseDate: "2021-06-09",
  genre: "Drama, Science Fiction",
  cover: { url: "https://example.test/loki.jpg" },
};
function issuedSession(token = "fixture-session") {
  return Response.json(
    { code: 0 },
    { headers: { "x-user": JSON.stringify({ token }) } },
  );
}
function providerFetch(
  searchResponse: (init: RequestInit) => Response | Promise<Response>,
) {
  return vi.fn(async (_url: URL | string, init: RequestInit) => {
    if (init.method !== "POST") return issuedSession();
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer fixture-session",
    );
    return searchResponse(init);
  });
}
afterEach(() => {
  invalidateSearchSession("fixture-session");
  invalidateSearchSession("renewed-session");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("provider index search reliability", () => {
  it("preserves provider pagination when filtering leaves fewer than 30 matches", async () => {
    vi.stubGlobal(
      "fetch",
      providerFetch(() =>
        Response.json({
          code: 0,
          data: { items: [loki], pager: { hasMore: true } },
        }),
      ),
    );
    const result = await searchPage("Loki", 2, "show");
    expect(result.page).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.hasNextPage).toBe(true);
  });
  it("does not let a cancelled caller cancel a shared session bootstrap", async () => {
    let deliver!: (response: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          deliver = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const first = new AbortController();
    const cancelled = getSearchSession(first.signal);
    const active = getSearchSession(new AbortController().signal);
    first.abort(new Error("caller cancelled"));
    await expect(cancelled).rejects.toThrow("caller cancelled");
    deliver(issuedSession());
    await expect(active).resolves.toBe("fixture-session");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("bootstraps a guest session before searching the provider", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const fetchMock = providerFetch(() =>
      Response.json({ code: 0, data: { items: [loki] } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const results = await search("Loki", 7, "show");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/home?host=movibox.net");
    expect(new Headers(init.headers).get("X-Client-Token")).toBe(
      "1700000000,89da8c2d42b407040b11533d97cd8620",
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toMatchObject(
      { keyword: "Loki", page: 7, subjectType: 2 },
    );
    expect(results[0]).toMatchObject({
      title: "Loki",
      kind: "show",
      id: "mb-123456789~loki-series-123",
    });
    expect(JSON.stringify(results)).not.toContain("fixture-session");
  });
  it("recovers a TV series when the combined index is empty", async () => {
    const fetchMock = providerFetch((init) => {
      const body = JSON.parse(init.body as string) as { subjectType: number };
      return Response.json({
        code: 0,
        data: { items: body.subjectType === 2 ? [loki] : [] },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    expect((await search("Loki", 1, "all"))[0].kind).toBe("show");
    expect(fetchMock).toHaveBeenCalledTimes(4); // one session plus three index queries
  });
  it("shares the handshake between concurrent searches and reuses it", async () => {
    const fetchMock = providerFetch(() =>
      Response.json({ code: 0, data: { items: [loki] } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all([search("Loki", 1, "show"), search("Loki", 2, "show")]);
    await search("Loki", 3, "show");
    expect(
      fetchMock.mock.calls.filter(([, init]) => init.method !== "POST"),
    ).toHaveLength(1);
    expect(
      fetchMock.mock.calls.filter(([, init]) => init.method === "POST"),
    ).toHaveLength(3);
  });
  it("renews a session after a rejected token without changing page/type", async () => {
    let bootstraps = 0;
    const posts: { page: number; subjectType: number }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: URL | string, init: RequestInit) => {
        if (init.method !== "POST")
          return issuedSession(
            ++bootstraps === 1 ? "fixture-session" : "renewed-session",
          );
        posts.push(JSON.parse(init.body as string));
        if (
          new Headers(init.headers).get("Authorization") ===
          "Bearer fixture-session"
        )
          return Response.json({ message: "invalid token" }, { status: 400 });
        return Response.json({ code: 0, data: { items: [loki] } });
      }),
    );
    expect((await search("Loki", 7, "show"))[0].title).toBe("Loki");
    expect(bootstraps).toBe(2);
    expect(posts).toHaveLength(2);
    expect(
      posts.every((body) => body.page === 7 && body.subjectType === 2),
    ).toBe(true);
  });
  it("reboots expired sessions", async () => {
    let now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const fetchMock = providerFetch(() =>
      Response.json({ code: 0, data: { items: [loki] } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await search("Loki", 1, "show");
    now += 5 * 60_000 + 1;
    await search("Loki", 1, "show");
    expect(
      fetchMock.mock.calls.filter(([, init]) => init.method !== "POST"),
    ).toHaveLength(2);
  });
  it("does not present malformed provider errors as an empty result", async () => {
    vi.stubGlobal(
      "fetch",
      providerFetch(() =>
        Response.json({ code: 0, data: { warning: "blocked" } }),
      ),
    );
    await expect(search("Loki")).rejects.toBeInstanceOf(
      ProviderSearchUnavailable,
    );
  });
  it("does not fabricate a session when the provider does not issue one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ code: 0 })),
    );
    await expect(search("Loki")).rejects.toBeInstanceOf(
      ProviderSearchUnavailable,
    );
  });
  it("allows genuinely empty parsed search results", async () => {
    vi.stubGlobal(
      "fetch",
      providerFetch(() => Response.json({ code: 0, data: { items: [] } })),
    );
    expect(await search("Unknown Search Title")).toEqual([]);
  });
});
