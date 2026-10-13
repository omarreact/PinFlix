// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/src/components/watch-player", () => ({
  WatchPlayer: ({
    season,
    episode,
    onClose,
  }: {
    season: number;
    episode: number;
    onClose: () => void;
  }) => (
    <div data-testid="playback">
      Playing {season}:{episode}
      <button onClick={onClose}>Close player</button>
    </div>
  ),
}));
import { Artwork } from "./artwork";
import { Shell } from "./shell";
import { Hero } from "./hero";
import { Library } from "./library";
import { Browse } from "./browse";
import {
  InlinePlayButton,
  InlinePlaybackBanner,
} from "@/src/components/inline-playback";
import { toTitle, type Catalogue } from "@/src/lib/source-ui";
import { readSavedTitles, writeSavedTitles } from "@/src/lib/saved";
import { saveProgress } from "@/src/lib/history";
const item = {
  id: "mb-123~example",
  slug: "mb-123~example",
  title: "Example",
  kind: "movie" as const,
  genres: ["Action"],
  poster: "",
  backdrop: "",
  synopsis: "A story",
  year: 2021,
};
beforeEach(() => {
  localStorage.clear();
  push.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("ported source UI flows", () => {
  it("shows separate Marvel and DC collection headings", () => {
    const initial: Catalogue = {
      items: [],
      categories: [
        { name: "Marvel", kind: "movie", mature: false },
        { name: "DC", kind: "movie", mature: false },
      ],
      years: [],
      page: 1,
      hasNext: false,
      stale: false,
      retrievedAt: new Date().toISOString(),
    };
    render(<Browse initial={initial} initialCategory="Marvel" />);
    expect(
      screen.getByRole("heading", { name: "Marvel collection." }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "DC" },
    });
    expect(
      screen.getByRole("heading", { name: "DC collection." }),
    ).toBeTruthy();
  });
  it("recovers artwork when switching away from a failed poster", () => {
    const view = render(
      <Artwork src="https://images.example/broken.jpg" alt="First" />,
    );
    fireEvent.error(screen.getByRole("img"));
    expect(view.container.querySelector("img")).toBeNull();
    view.rerender(
      <Artwork src="https://images.example/working.jpg" alt="Second" />,
    );
    expect(view.container.querySelector("img")?.src).toBe(
      "https://images.example/working.jpg",
    );
  });
  it("opens the screenshot drawer from mobile navigation and restores focus", () => {
    render(<Shell categories={[]}>Home</Shell>);
    const opener = screen.getByRole("button", { name: "Toggle navigation" });
    fireEvent.click(opener);
    const drawer = screen.getByRole("dialog", { name: "Browse categories" });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close categories" }),
    );
    fireEvent.keyDown(drawer, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Browse categories" }),
    ).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
  it("opens search, navigates suggestions, and restores focus after Escape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ catalog: [item] }) }),
    );
    render(<Shell categories={[]}>Home</Shell>);
    const opener = screen.getByRole("button", { name: "Search catalogue" });
    fireEvent.click(opener);
    const input = screen.getByRole("combobox");
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "Example" } });
    await waitFor(() => expect(screen.getByRole("option")).toBeTruthy());
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/entertainment/mb-123~example");
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(document.activeElement).toBe(opener);
  });
  it("switches spotlight titles and saves into existing PinFlix storage", async () => {
    render(
      <Hero
        titles={[
          toTitle(item),
          toTitle({ ...item, id: "mb-456~second", title: "Second" }),
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Feature Second" }));
    expect(screen.getByRole("heading", { name: "Second" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "My List" }));
    expect(readSavedTitles()[0].id).toBe("mb-456~second");
    expect(
      screen
        .getByRole("button", { name: "In My List" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
  it("shows existing saved/history records and preserves episode resume links", () => {
    writeSavedTitles([item]);
    saveProgress({
      ...item,
      id: "mb-789~series",
      slug: "mb-789~series",
      title: "A series",
      kind: "show",
      season: 2,
      episode: 3,
      position: 60,
      duration: 600,
      updatedAt: Date.now(),
      completed: false,
    });
    render(<Library />);
    expect(screen.getByRole("link", { name: /Example/ })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /A series/ }).getAttribute("href"),
    ).toContain("season=2&episode=3&autoplay=1");
    fireEvent.click(screen.getByRole("button", { name: /Watch history/ }));
    expect(screen.getAllByRole("link", { name: /A series/ })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: /Example/ })).toBeNull();
  });
  it("loads filtered pages and deduplicates appended provider titles", async () => {
    const initial: Catalogue = {
      items: [toTitle(item)],
      categories: [],
      years: [2021],
      page: 1,
      hasNext: true,
      stale: false,
      retrievedAt: new Date().toISOString(),
    };
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...initial,
        page: 2,
        hasNext: false,
        items: [
          toTitle(item),
          toTitle({ ...item, id: "mb-456~second", title: "Second" }),
        ],
      }),
    });
    vi.stubGlobal("fetch", fetcher);
    render(<Browse initial={initial} kind="movie" />);
    fireEvent.click(screen.getByRole("button", { name: /More stories/ }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Second" })).toBeTruthy(),
    );
    expect(screen.getAllByRole("heading", { name: "Example" })).toHaveLength(1);
    expect(fetcher.mock.calls[0][0]).toContain("page=2");
    expect(screen.getByLabelText("Quality").hasAttribute("disabled")).toBe(
      false,
    );
  });
  it("keeps the selected title order across More stories pages", async () => {
    const initial: Catalogue = {
      items: [toTitle(item)],
      categories: [],
      years: [2021],
      page: 1,
      hasNext: true,
      stale: false,
      retrievedAt: new Date().toISOString(),
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => initial })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...initial,
          page: 2,
          hasNext: false,
          items: [
            toTitle({ ...item, id: "mb-456~alphabet", title: "Alphabet" }),
          ],
        }),
      });
    vi.stubGlobal("fetch", fetcher);
    const view = render(<Browse initial={initial} kind="movie" />);
    fireEvent.change(screen.getByLabelText("Sort titles"), {
      target: { value: "title" },
    });
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: /More stories/ })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: /More stories/ }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Alphabet" })).toBeTruthy(),
    );
    expect(
      [...view.container.querySelectorAll(".card-grid h3")].map(
        (node) => node.textContent,
      ),
    ).toEqual(["Alphabet", "Example"]);
  });
  it("loads real episode counts when seasons change and keeps story details during playback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ seasons: [1, 2], season: 2, episodes: 2 }),
      }),
    );
    render(
      <InlinePlaybackBanner
        mediaId={item.id}
        title="Series"
        backHref="/series"
        poster=""
        historyItem={{ slug: item.id, kind: "show" }}
        navigation={{ seasons: [1, 2], season: 1, episodes: 5 }}
        details={<p>Story details</p>}
      >
        <InlinePlayButton>Play</InlinePlayButton>
      </InlinePlaybackBanner>,
    );
    fireEvent.change(screen.getByLabelText("Select season"), {
      target: { value: "2" },
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Play episode 5" }),
      ).toBeNull(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Play episode 2" }));
    expect(screen.getByTestId("playback").textContent).toContain("Playing 2:2");
    expect(screen.getByText("Story details")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close player" }));
    expect(screen.queryByTestId("playback")).toBeNull();
  });
});
