import { searchLibrary } from "@/src/lib/search-service";
import { safeSearchKind, safeSearchQuery, safeSearchSource } from "@/src/lib/search-ranking";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:Request){
  const url=new URL(request.url);
  const q=safeSearchQuery(url.searchParams.get("q"));
  const kind=safeSearchKind(url.searchParams.get("kind"));
  const source=safeSearchSource(url.searchParams.get("source"));
  const raw=Number(url.searchParams.get("page")||"1");
  const page=Number.isInteger(raw)?Math.max(1,Math.min(100,raw)):1;
  if(q.length<2) return Response.json({query:q,kind,source,page,catalog:[],discovery:[],
    catalogHasMore:false,discoveryHasMore:false,discoveryTotal:0,tmdbConfigured:false,warnings:[]},
    {headers:{"Cache-Control":"no-store"}});
  try{
    const data=await searchLibrary({query:q,kind,source,page});
    return Response.json(data,{headers:{"Cache-Control":"public, s-maxage=30, stale-while-revalidate=60"}});
  }catch(error){
    console.error("PinFlix live search failed",error);
    return Response.json({error:"Search is temporarily unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
