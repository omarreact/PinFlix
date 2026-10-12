// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WatchPlayer } from "./watch-player";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.ComponentProps<"a">) => <a href={href} {...props}>{children}</a> }));
const sources = [
  { url: "https://media.example/720.mp4", quality: "720p", protocol: "native", priority: 0 },
  { url: "https://media.example/1080.mp4", quality: "1080p", protocol: "native", priority: 1 },
];
beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sources }) }));
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) { Object.defineProperty(this, "paused", { configurable: true, value: false }); return Promise.resolve(); });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) { Object.defineProperty(this, "paused", { configurable: true, value: true }); });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function mount(extra = {}) {
  const view = render(<WatchPlayer mediaId="example" title="Example" backHref="/movies" inline {...extra}/>);
  const video = view.container.querySelector("video")!;
  await waitFor(() => expect(video.src).toBe(sources[0].url));
  await waitFor(() => expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy());
  Object.defineProperty(video, "duration", { configurable: true, value: 100 });
  fireEvent.loadedMetadata(video);
  return { ...view, video };
}
describe("ported player interactions", () => {
  it("keeps provider source switching and seek position", async () => {
    const { video } = await mount();
    video.currentTime = 32;
    fireEvent.change(screen.getByLabelText("Video quality"), { target: { value: "source:1" } });
    await waitFor(() => expect(video.src).toBe(sources[1].url));
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(32);
    expect(window.localStorage.getItem("pinflix-quality")).toBe("1080p");
  });
  it("cycles fit modes and preserves speed preference", async () => {
    const { video } = await mount();
    for (const [from, to] of [["contain", "cover"], ["cover", "fill"], ["fill", "contain"]]) {
      fireEvent.click(screen.getByRole("button", { name: `Video fit: ${from}` }));
      expect(video.style.objectFit).toBe(to);
    }
    fireEvent.change(screen.getByLabelText("Playback speed"), { target: { value: "1.5" } });
    expect(video.playbackRate).toBe(1.5);
    expect(window.localStorage.getItem("pinflix-playback-rate")).toBe("1.5");
  });
  it("double taps seek once without synthetic click pausing playback", async () => {
    const { video, container } = await mount();
    vi.useFakeTimers();
    video.currentTime = 20;
    const shell = container.querySelector(".pf-player")!;
    vi.spyOn(shell, "getBoundingClientRect").mockReturnValue({ left: 0, width: 400 } as DOMRect);
    fireEvent.touchEnd(video, { changedTouches: [{ clientX: 350 }] });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.touchEnd(video, { changedTouches: [{ clientX: 350 }] });
    fireEvent.click(video);
    expect(video.currentTime).toBe(25);
    act(() => vi.advanceTimersByTime(350));
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  });
  it("ignores nested control taps and exposes actual native audio", async () => {
    const { video } = await mount();
    const tracks = [{ label: "English", enabled: true }, { label: "Bangla", enabled: false }];
    Object.defineProperty(video, "audioTracks", { configurable: true, value: tracks });
    fireEvent.loadedMetadata(video);
    fireEvent.change(screen.getByLabelText("Audio track"), { target: { value: "1" } });
    expect(tracks.map(track => track.enabled)).toEqual([false, true]);
    video.currentTime = 20;
    const forward = screen.getByRole("button", { name: "Forward 10 seconds" });
    fireEvent.touchEnd(forward.querySelector("svg")!, { changedTouches: [{ clientX: 350 }] });
    fireEvent.click(forward.querySelector("svg")!);
    expect(video.currentTime).toBe(30);
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  });
  it("retains automatic next episode and error failover", async () => {
    const onNext = vi.fn();
    const { video } = await mount({ onNext });
    fireEvent.ended(video);
    expect(onNext).toHaveBeenCalledOnce();
    fireEvent.error(video);
    await waitFor(() => expect(video.src).toBe(sources[1].url));
  });
});
