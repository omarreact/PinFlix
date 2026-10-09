import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, HEAD } from "../app/api/proxy-video/route";
import { fetchCineplexOrigin, isAllowedCineplexUrl } from "../src/lib/cineplex-origin";

afterEach(() => vi.unstubAllGlobals());
const request = (url: string, headers = {}) => new NextRequest(`https://pinflix.example/api/proxy-video?url=${encodeURIComponent(url)}`, { headers });

describe("media proxy", () => {
  it("streams byte ranges and mirrors partial-content metadata", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 206, headers: { "Content-Range": "bytes 0-2/100", "Content-Length": "3", "Accept-Ranges": "bytes", "Content-Type": "video/mp4" } }));
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(request("http://cds3.cineplexbd.net/demo.mp4", { Range: "bytes=0-2" }));
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 0-2/100");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(fetcher.mock.calls[0][1].headers.get("Range")).toBe("bytes=0-2");
  });
  it("supports bodyless HEAD and preserves unsatisfiable range responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { headers: { "Content-Length": "100" } })).mockResolvedValueOnce(new Response(null, { status: 416, headers: { "Content-Range": "bytes */100" } })));
    const head = await HEAD(request("http://cds3.cineplexbd.net/demo.mp4"));
    expect(head.body).toBeNull();
    expect(head.headers.get("content-length")).toBe("100");
    const range = await GET(request("http://cds3.cineplexbd.net/demo.mp4"));
    expect(range.status).toBe(416);
    expect(range.headers.get("content-range")).toBe("bytes */100");
  });
  it("rejects unrelated hosts, credentials, ports, and redirected private targets", async () => {
    expect(isAllowedCineplexUrl("http://localhost/video.mp4")).toBe(false);
    expect(isAllowedCineplexUrl("http://user:pass@cds3.cineplexbd.net/video.mp4")).toBe(false);
    expect(isAllowedCineplexUrl("http://cds3.cineplexbd.net:1234/video.mp4")).toBe(false);
    expect((await GET(request("http://localhost/video.mp4"))).status).toBe(403);
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/private" } }));
    vi.stubGlobal("fetch", fetcher);
    await expect(fetchCineplexOrigin("http://cds3.cineplexbd.net/demo.mp4")).rejects.toThrow("upstream host");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("converts HTTP SRT sidecars to browser-safe WebVTT", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("1\n00:00:00,100 --> 00:00:02,000\nHi")));
    const response = await GET(request("http://cds3.cineplexbd.net/demo.srt"));
    expect(response.headers.get("content-type")).toContain("text/vtt");
    expect(await response.text()).toContain("00:00:00.100");
  });
});
