// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdvancedFilter } from "./advanced-filter";
import { CategoryDrawer } from "./category-drawer";
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);
describe("screenshot menu and advanced filter", () => {
  it("commits combined filters only on Apply, with unique year choices", () => {
    const onApply = vi.fn(),
      onClose = vi.fn();
    render(
      <AdvancedFilter
        initial={{ title: "", actor: "", genres: "", category: "", years: [] }}
        categories={["Marvel", "English"]}
        onApply={onApply}
        onClose={onClose}
      />,
    );
    fireEvent.change(screen.getByLabelText("Advanced title"), {
      target: { value: "Inception" },
    });
    fireEvent.change(screen.getByLabelText("Advanced actors"), {
      target: { value: "Leonardo DiCaprio" },
    });
    fireEvent.change(screen.getByLabelText("Advanced genres"), {
      target: { value: "Action" },
    });
    fireEvent.click(screen.getByLabelText("2010"));
    fireEvent.click(screen.getByLabelText("2012"));
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "APPLY FILTER" }));
    expect(onApply).toHaveBeenCalledWith({
      title: "Inception",
      actor: "Leonardo DiCaprio",
      genres: "Action",
      category: "",
      years: ["2010", "2012"],
    });
    expect(screen.getAllByLabelText("2022")).toHaveLength(1);
  });
  it("Cancel and Escape leave applied filters unchanged", () => {
    const onApply = vi.fn(),
      onClose = vi.fn();
    render(
      <AdvancedFilter
        initial={{ title: "", actor: "", genres: "", category: "", years: [] }}
        categories={[]}
        onApply={onApply}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "CANCEL" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onApply).not.toHaveBeenCalled();
  });
  it("uses working catalogue, official-resource and external-source routes", () => {
    render(<CategoryDrawer onClose={vi.fn()} />);
    expect(
      screen.getByRole("link", { name: "4K Movies" }).getAttribute("href"),
    ).toBe("/movies?category=4K%20Movies");
    expect(screen.getByRole("link", { name: "Korean" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /3D Movies/ }).getAttribute("href"),
    ).toContain("http://cineplexbd.net/category.php?category=3D%20Movies");
    expect(
      screen
        .getByRole("link", { name: "Browse games", hidden: true })
        .getAttribute("href"),
    ).toBe("/collections/games");
    expect(
      screen
        .getByRole("link", { name: "Browse software", hidden: true })
        .getAttribute("href"),
    ).toBe("/collections/software");
    expect(
      screen
        .getByRole("link", { name: "Browse tutorial", hidden: true })
        .getAttribute("href"),
    ).toBe("/collections/tutorials");
  });
});
