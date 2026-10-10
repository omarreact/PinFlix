import { describe, expect, it } from "vitest";
import { availableGenres, catalogueHref, catalogueRails, filterCatalogue, matchesGenre, parseCatalogueGenre, parseCatalogueKind } from "./catalogue";
import type { Entertainment } from "@/src/types/catalog";
const title = (id:string,kind:"movie"|"show",genres:string[],provider="moviebox"):Entertainment => ({
  id,slug:id,title:id,kind,genres,poster:"",backdrop:"",synopsis:"",provider
});
describe("Provider catalogue categorization",()=>{
  const items=[title("mb-1","movie",["Action","Thriller"]),title("mb-2","movie",["Sci-Fi","Action"]),
    title("mb-3","show",["Action","Drama"]),title("tmdb-movie-4","movie",["Drama"],"tmdb")];
  it("shows only real provider items in each genre",()=>{
    expect(filterCatalogue(items,"movie","action").map(x=>x.id)).toEqual(["mb-1","mb-2"]);
    expect(filterCatalogue(items,"all",null)).toHaveLength(3);
    expect(matchesGenre(items[1],"science-fiction")).toBe(true);
  });
  it("derives displayed genre choices from actual catalogue data",()=>{
    expect(availableGenres(items).map(x=>x.slug)).toContain("action");
    expect(availableGenres(items).map(x=>x.slug)).not.toContain("horror");
    expect(catalogueRails(items,3)[0]?.slug).toBe("action");
  });
  it("validates genre and creates stable links",()=>{
    expect(parseCatalogueGenre("not-genre")).toBe(null);
    expect(parseCatalogueKind("unknown")).toBe("all");
    expect(catalogueHref("show","crime",2)).toBe("/catalogue?kind=show&genre=crime&page=2");
  });
});
