import { describe, expect, it } from "vitest";
import {
  screenshotCategory,
  matchesScreenshotCategory,
} from "./screenshot-categories";
import type { Entertainment } from "@/src/types/catalog";
describe("screenshot collection matching", () => {
  it("keeps Others Animation distinct from named language collections", () => {
    const category = screenshotCategory("Others Animation")!;
    const item: Entertainment = {
      id: "mb-123~animation",
      slug: "mb-123~animation",
      title: "Animation",
      kind: "show",
      genres: ["Animation"],
      poster: "",
      backdrop: "",
      synopsis: "",
    };
    expect(
      matchesScreenshotCategory({ ...item, audioLanguages: ["en"] }, category),
    ).toBe(false);
    expect(
      matchesScreenshotCategory({ ...item, audioLanguages: ["ja"] }, category),
    ).toBe(true);
    expect(matchesScreenshotCategory(item, category)).toBe(false);
  });
});
