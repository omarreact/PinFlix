import { describe, expect, it } from "vitest";
import { availableGenres, catalogueHref, catalogueRails, filterCatalogue, isAdultTitle, matchesGenre, parseCatalogueGenre, parseCatalogueKind } from "./catalogue";
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
  it("routes Adult 18+ to a separate category and respects provider metadata",()=>{
    const mature=title("mb-18","movie",["Thriller", "18+"]);
    const drama=title("mb-drama","movie",["Drama"]);
    const adultTmdb=title("tmdb-adult","movie",["Adult"],"tmdb");
    expect(parseCatalogueGenre("adult")).toBe("adult");
    expect(catalogueHref("all","adult")).toBe("/catalogue/adult");
    expect(catalogueHref("show","adult",2)).toBe("/catalogue/adult?kind=show&page=2");
    expect(isAdultTitle(mature)).toBe(true);
    expect(matchesGenre(mature,"adult")).toBe(true);
    expect(isAdultTitle(drama)).toBe(false);
    expect(filterCatalogue([mature,drama,adultTmdb],"all","adult").map(i=>i.id)).toEqual(["mb-18"]);
    expect(filterCatalogue([mature,drama],"all",null).map(i=>i.id)).toEqual(["mb-drama"]);
    expect(availableGenres([mature]).map(i=>i.slug)).not.toContain("adult");
    expect(catalogueRails([mature,mature,mature]).length).toBe(0);
  });
  it("validates genre and creates stable links",()=>{
    expect(parseCatalogueGenre("not-genre")).toBe(null);
    expect(parseCatalogueKind("unknown")).toBe("all");
    expect(catalogueHref("show","crime",2)).toBe("/catalogue?kind=show&genre=crime&page=2");
  });
});
