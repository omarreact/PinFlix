import { describe, expect, it } from "vitest";
import { cleanMediaName, parseDirectory } from "../src/lib/ingest/directory";
import { rewriteManifest } from "../src/lib/media-manifest";
import { toWebVtt } from "../src/lib/subtitles";

describe("directory ingestion", () => {
  it("extracts title/year and series episode from scene names", () => {
    expect(cleanMediaName("Inception.2010.REMASTERED.1080p.BluRay.x264.mp4")).toMatchObject({ title: "Inception", year: 2010 });
    expect(cleanMediaName("Example.Show.S02E03.1080p.WEBRip.mp4")).toMatchObject({ title: "Example Show", season: 2, episode: 3 });
  });
  it("keeps traversal on the configured origin and skips unsupported containers", () => {
    const entries = parseDirectory(`<a href="../">Parent Directory</a><a href="season/">Season</a><a href="demo.mp4">Video</a><a href="demo.mp4">Duplicate</a><a href="demo.srt">Subtitle</a><a href="bad.mkv">Unsupported</a><a href="http://localhost/private.mp4">Private</a><a href="//other.net/video.mp4">Other host</a><a href="%XX.mp4">Malformed</a>`, "http://cds3.cineplexbd.net/library/", "http://cds3.cineplexbd.net/library/");
    expect(entries.map((entry) => entry.kind)).toEqual(["directory", "video", "subtitle"]);
  });
  it("prevents traversal above the configured directory", () => {
    expect(parseDirectory('<a href="../../outside.mp4">Outside</a>', 'http://cds3.cineplexbd.net/library/season/', 'http://cds3.cineplexbd.net/library/')).toEqual([]);
  });
});

describe("HLS and captions", () => {
  it("rewrites playlists, keys, maps, and segments without altering blank lines", () => {
    const manifest = '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="../key.bin?token=abc"\n#EXT-X-MAP:URI="init.mp4"\n  \n720p/list.m3u8\nhttps://cds3.cineplexbd.net/segment.ts';
    const output = rewriteManifest(manifest, 'http://cds3.cineplexbd.net/media/master.m3u8');
    expect(output).toContain('URI="/api/proxy-video?url=' + encodeURIComponent('http://cds3.cineplexbd.net/key.bin?token=abc') + '"');
    expect(output).toContain(encodeURIComponent('http://cds3.cineplexbd.net/media/720p/list.m3u8'));
    expect(output).toContain('\n  \n');
    expect(output).toContain(encodeURIComponent('https://cds3.cineplexbd.net/segment.ts'));
  });
  it("converts SRT timestamp commas and preserves existing WebVTT", () => {
    expect(toWebVtt('\uFEFF1\r\n00:00:01,500 --> 00:00:03,000\r\nHello')).toBe('WEBVTT\n\n1\n00:00:01.500 --> 00:00:03.000\nHello');
    expect(toWebVtt('WEBVTT\n\n00:00:01.500 --> 00:00:03.000\nHello')).toMatch(/^WEBVTT\n\n00/);
  });
});
