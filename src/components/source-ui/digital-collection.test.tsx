// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DigitalCollection } from "./digital-collection";
import { DIGITAL_COLLECTIONS } from "@/src/lib/digital-collections";
afterEach(cleanup);
describe("functional digital collections", () => {
  it("filters games and preserves official download destinations", () => {
    const collection = DIGITAL_COLLECTIONS.games;
    render(<DigitalCollection {...collection} />);
    fireEvent.change(screen.getByLabelText("Search games"), {
      target: { value: "racing" },
    });
    expect(screen.getByRole("heading", { name: "SuperTuxKart" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Luanti" })).toBeNull();
    expect(
      screen
        .getByRole("link", { name: /Official downloads/ })
        .getAttribute("href"),
    ).toBe("https://supertuxkart.net/Download");
    fireEvent.change(screen.getByLabelText("Search games"), {
      target: { value: "no-such-game" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("heading", { name: "Luanti" })).toBeTruthy();
  });
});
