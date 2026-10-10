import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderSearchUnavailable, search } from "./web";
const loki = {
  subjectId: "123456789",
  detailPath: "loki-series-123",
  title: "Loki",
  subjectType: "2",
  releaseDate: "2021-06-09",
  genre: "Drama, Science Fiction",
  cover: { url: "https://example.test/loki.jpg" },
};
afterEach(() => vi.unstubAllGlobals());

describe("provider index search reliability",()=>{
  it("recovers a TV series when the combined index is empty",async()=>{
    const fetchMock=vi.fn(async (_url:URL,init:RequestInit)=>{
      const body=JSON.parse(init.body as string) as {subjectType:number};
      return Response.json({code:0,message:"ok",data:{items:body.subjectType===2?[loki]:[]}});
    });
    vi.stubGlobal("fetch",fetchMock);
    const results=await search("Loki",1,"all");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Loki");
    expect(results[0].kind).toBe("show");
    expect(results[0].id).toBe("mb-123456789~loki-series-123");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("uses the TV provider index directly for TV search",async()=>{
    const fetchMock=vi.fn(async (_url:URL,init:RequestInit)=>{
      const body=JSON.parse(init.body as string) as {subjectType:number};
      expect(body.subjectType).toBe(2);
      return Response.json({code:0,message:"ok",data:{items:[loki]}});
    });
    vi.stubGlobal("fetch",fetchMock);
    expect((await search("Loki",1,"show"))[0].kind).toBe("show");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("does not present malformed provider errors as a legitimate empty result",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>Response.json({code:0,message:"ok",data:{warning:"blocked"}})));
    await expect(search("Loki")).rejects.toBeInstanceOf(ProviderSearchUnavailable);
  });
  it("allows truly empty, successfully parsed search results",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>Response.json({code:0,message:"ok",data:{items:[]}})));
    expect(await search("Unknown Search Title")).toEqual([]);
  });
});
