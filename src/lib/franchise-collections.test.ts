import { describe, expect, it } from "vitest";
import { franchiseCollection, matchesFranchise } from "./franchise-collections";
import type { Entertainment } from "@/src/types/catalog";
const item = (title: string, year?: number): Entertainment => ({
  id: "mb-123~example",
  slug: "mb-123~example",
  title,
  year,
  kind: "movie",
  genres: [],
  poster: "",
  backdrop: "",
  synopsis: "Marvel DC superheroes",
});
describe("separate Marvel and DC collections", () => {
  it("recognizes publisher labels and title families without crossing publishers", () => {
    for (const title of [
      "Avengers: Endgame",
      "Spider-Man: No Way Home",
      "Marvel Studios: Legends S1-S2",
    ]) {
      expect(matchesFranchise(item(title), "marvel")).toBe(true);
      expect(matchesFranchise(item(title), "dc")).toBe(false);
    }
    for (const title of [
      "The Batman",
      "Justice League",
      "DC League of Super-Pets",
    ]) {
      expect(matchesFranchise(item(title), "dc")).toBe(true);
      expect(matchesFranchise(item(title), "marvel")).toBe(false);
    }
    expect(
      matchesFranchise(
        { ...item("Unfamiliar title"), collections: ["DC Comics"] },
        "dc",
      ),
    ).toBe(true);
  });
  it("rejects similar names and synopsis-only matches", () => {
    for (const title of [
      "Avengers Grimm",
      "Avengers Grimm: Time Wars",
      "Iron Man The Champion",
      "Project Loki",
      "Mythical Detective Loki Ragnarok",
      "Thor: God of Thunder",
      "Marvelous Love",
      "Random film",
    ])
      expect(matchesFranchise(item(title, 2022), "marvel")).toBe(false);
    expect(matchesFranchise(item("The Avengers", 1998), "marvel")).toBe(false);
    expect(matchesFranchise(item("The Flash", 2016), "dc")).toBe(false);
    expect(matchesFranchise(item("DC Down"), "dc")).toBe(false);
    expect(matchesFranchise(item("DC Noir"), "dc")).toBe(false);
    expect(matchesFranchise(item("Thor", 2011), "marvel")).toBe(true);
    expect(franchiseCollection("MARVEL")?.label).toBe("Marvel");
  });
});
