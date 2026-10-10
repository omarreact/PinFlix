import { describe, expect, it } from "vitest";
import { normalizeTitle, titlesIdentifySameWork, firstExactMatch } from "./title-match-utils";

describe("TMDB to playback match safety", () => {
  it("normalizes punctuation and accents", () => {
    expect(normalizeTitle("Amélie: The Film!")).toBe("amelie the film");
  });
  it("keeps movies and TV shows distinct", () => {
    expect(titlesIdentifySameWork({ title: "Dune", kind: "movie", year: 2021 }, { title: "Dune", kind: "show", year: 2021 })).toBe(false);
  });
  it("rejects different release years and unrelated titles", () => {
    expect(titlesIdentifySameWork({ title: "Dune", kind: "movie", year: 1984 }, { title: "Dune", kind: "movie", year: 2021 })).toBe(false);
    expect(titlesIdentifySameWork({ title: "Dune", kind: "movie" }, { title: "Dune 2", kind: "movie" })).toBe(false);
  });
  it("uses a provider's own playable ID on an exact match", () => {
    const match = firstExactMatch({ title: "Dune", kind: "movie", year: 2021 }, [{ id: "mb-123~dune", title: "Dune", kind: "movie" as const, year: 2021 }]);
    expect(match?.id).toBe("mb-123~dune");
  });
});
