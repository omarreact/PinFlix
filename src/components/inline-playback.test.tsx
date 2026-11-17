// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { InlinePlaybackBanner, InlinePlayButton } from "./inline-playback";

vi.mock("@/src/components/watch-player", () => ({
  WatchPlayer: ({ season, episode, onNext }: { season: number; episode: number; onNext?: () => void }) => (
    <div data-testid="playing">S{season} E{episode}{onNext && <button onClick={onNext}>Next episode</button>}</div>
  ),
}));
vi.mock("@/src/components/source-ui/artwork", () => ({ Artwork: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function banner(extra = {}) {
  return render(<InlinePlaybackBanner mediaId="mb-123~show" title="Series" backHref="/series"
    historyItem={{ slug: "mb-123~show", kind: "show" }}
    navigation={{ seasons: [1, 2], season: 1, episodes: 3, episodeNumbers: [1, 3] }} {...extra}>
    <InlinePlayButton />
  </InlinePlaybackBanner>);
}

it("loads the selected season through the episode API and plays its actual episode numbers", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ seasons: [1, 2], season: 2, episodes: 5, episodeNumbers: [2, 5] }));
  vi.stubGlobal("fetch", fetcher);
  banner();
  expect(screen.queryByRole("button", { name: "Play episode 2" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Select season"), { target: { value: "2" } });
  await screen.findByRole("button", { name: "Play episode 5" });
  expect(fetcher.mock.calls[0][0]).toBe("/api/ui/episodes?id=mb-123~show&season=2");
  fireEvent.click(screen.getByRole("button", { name: "Play episode 2" }));
  expect(screen.getByTestId("playing").textContent).toContain("S2 E2");
  fireEvent.click(screen.getByRole("button", { name: "Next episode" }));
  expect(screen.getByTestId("playing").textContent).toBe("S2 E5");
  expect(screen.queryByRole("button", { name: "Next episode" })).toBeNull();
});

it("preserves the current season when the episode API fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
  banner();
  fireEvent.change(screen.getByLabelText("Select season"), { target: { value: "2" } });
  await screen.findByRole("alert");
  await waitFor(() => expect((screen.getByLabelText("Select season") as HTMLSelectElement).value).toBe("1"));
  fireEvent.click(screen.getByRole("button", { name: "Play episode 3" }));
  expect(screen.getByTestId("playing").textContent).toBe("S1 E3");
});

it("preserves a saved episode for CDN playback when provider navigation is unavailable", () => {
  banner({ navigation: null, initialSeason: 2, initialEpisode: 4, initialPlay: true });
  expect(screen.getByTestId("playing").textContent).toBe("S2 E4");
});
