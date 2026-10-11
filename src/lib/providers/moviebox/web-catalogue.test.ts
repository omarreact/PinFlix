import { afterEach, describe, expect, it, vi } from "vitest";
import { getLatestPage } from "./web";

const movie = { subjectId:"1654274595068805784", title:"Catalog Movie", subjectType:1, detailPath:"catalog-movie-1", cover:{url:"https://pbcdn.aoneroom.com/poster.jpg"} };
const show = { subjectId:"1654274595068805785", title:"Catalog TV", subjectType:2, detailPath:"catalog-tv-2" };
function homeFeed() {
  return Response.json({code:0,message:"ok",data:{operatingList:[
    {title:"Latest movies", opId:"1", subjects:[movie]},
    {title:"TV shows", opId:"2", subjects:[show]},
  ]}});
}

afterEach(()=>vi.unstubAllGlobals());

describe("catalogue continuity during upstream failure",()=>{
  it("recovers both movies and series from the genuine home-feed data",async()=>{
    const calls:string[]=[];
    vi.stubGlobal("fetch",vi.fn(async(input:URL|string)=>{
      const pathname = new URL(String(input)).pathname;
      calls.push(pathname);
      if(pathname.endsWith("/subject/filter")) return Response.json({code:500,message:"filter unavailable",data:null});
      if(pathname.endsWith("/home"))return homeFeed();
      return new Response("not found",{status:404});
    }));
    const movies=await getLatestPage("movie",1);
    const shows=await getLatestPage("show",1);
    expect(movies.items.map(i=>i.title)).toEqual(["Catalog Movie"]);
    expect(shows.items.map(i=>i.title)).toEqual(["Catalog TV"]);
    expect(movies.items[0].id).toBe("mb-1654274595068805784~catalog-movie-1");
    expect(movies.hasNextPage).toBe(false);
    expect(calls).toContain("/wefeed-h5api-bff/home");
  });
  it("does not fabricate a second page when only the home feed is available",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>new Response("Down",{status:502})));
    const result=await getLatestPage("show",2,500);
    expect(result.items).toEqual([]);
    expect(result.page).toBe(2);
    expect(result.hasNextPage).toBe(false);
  });
  it("recovers from malformed filter JSON and keeps provider IDs",async()=>{
    vi.stubGlobal("fetch",vi.fn(async(input:URL|string)=>{
      if(String(input).includes("/subject/filter")) return new Response("HTML blocked",{status:200});
      return homeFeed();
    }));
    const result=await getLatestPage("movie",1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].provider).toBe("moviebox");
  });
  it("keeps successful paginated filter responses as the primary source",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>Response.json({code:0,message:"ok",data:{
      items:[movie],pager:{page:"3",hasMore:true},
    }})));
    const result=await getLatestPage("movie",3);
    expect(result.items.map(i=>i.title)).toEqual(["Catalog Movie"]);
    expect(result.hasNextPage).toBe(true);
    expect(result.page).toBe(3);
  });
});
