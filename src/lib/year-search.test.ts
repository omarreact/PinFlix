import { describe, expect, it } from "vitest";
import { exactYear, parseYearSearch, safeReleaseYear } from "./year-search";
import type { Entertainment } from "@/src/types/catalog";
const record = (year?:number):Entertainment => ({
  id:"mb-123~test",slug:"test",title:"Test",kind:"movie",provider:"moviebox",
  year,genres:[],poster:"",backdrop:"",synopsis:""
});
describe("release-year search",()=>{
  it("parses year-only queries",()=>{
    expect(parseYearSearch("2024")).toMatchObject({title:"",year:2024,yearOnly:true});
    expect(parseYearSearch(" 2020 ")).toMatchObject({year:2020,yearOnly:true});
  });
  it("parses title with year or filter and preserves normal queries",()=>{
    expect(parseYearSearch("Loki 2021")).toMatchObject({title:"Loki",year:2021});
    expect(parseYearSearch("Dune (2021)")).toMatchObject({title:"Dune",year:2021});
    expect(parseYearSearch("Dune", "2021")).toMatchObject({title:"Dune",year:2021});
    expect(parseYearSearch("The Matrix")).toMatchObject({title:"The Matrix",year:null});
    expect(parseYearSearch("Loki 2021","2023")).toMatchObject({title:"Loki",year:2023});
  });
  it("rejects implausible release years and filters exactly",()=>{
    expect(safeReleaseYear("not a year")).toBeNull();
    expect(safeReleaseYear("1800")).toBeNull();
    expect(safeReleaseYear("2099")).toBeNull();
    expect(safeReleaseYear("2022")).toBe(2022);
    expect(exactYear([record(2021),record(2022),record()],2022).map(i=>i.year)).toEqual([2022]);
    expect(exactYear([record(2021),record()],null)).toHaveLength(2);
  });
});
