import { describe, expect, it } from "vitest";
import { hideProviderDuplicates, rankSearch, safeSearchKind, safeSearchQuery, searchHref, searchScore } from "./search-ranking";
import type { Entertainment } from "@/src/types/catalog";
const film = (id:string,title:string,kind:"movie"|"show"="movie",provider="moviebox",year=2024): Entertainment => ({
  id,slug:id,title,kind,year,genres:[],poster:"",backdrop:"",synopsis:"",provider,
  providerId:provider==="tmdb"?"44":id,
});
describe("Search behavior",()=>{
  it("normalizes search input and kind safely",()=>{
    expect(safeSearchQuery("   hello    world ")).toBe("hello world");
    expect(safeSearchKind("tv")).toBe("all");
    expect(safeSearchKind("show")).toBe("show");
  });
  it("ranks exact title above prefix and substring",()=>{
    const items=[film("3","The Matrix Reloaded"),film("2","Matrix City"),film("1","Matrix")];
    expect(rankSearch(items,"Matrix","movie").map(i=>i.id)).toEqual(["1","2","3"]);
    expect(searchScore(film("2","Matrix City"),"Matrix")).toBeGreaterThan(searchScore(film("3","The Matrix Reloaded"),"Matrix"));
  });
  it("filters movie and TV correctly, never treats TMDB id as provider id",()=>{
    const data=[film("mb-1","Dune"),film("tmdb-tv-44","Dune","show","tmdb")];
    expect(rankSearch(data,"dune","show")).toHaveLength(1);
    expect(searchHref(data[0])).toBe("/entertainment/mb-1");
    expect(searchHref(data[1])).toBe("/title/tv/44");
  });
  it("dedupes matching TMDB discovery title, preserving conflicting years",()=>{
    const provider=[film("mb-1","Dune","movie","moviebox",2021)];
    const tmdb=[film("tmdb-1","Dune","movie","tmdb",2021),film("tmdb-2","Dune","movie","tmdb",1984)];
    expect(hideProviderDuplicates(tmdb,provider).map(x=>x.id)).toEqual(["tmdb-2"]);
  });
});
