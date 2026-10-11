import { searchLibrary } from "@/src/lib/search-service";
import { safeSearchKind, safeSearchQuery } from "@/src/lib/search-ranking";
import { parseYearSearch } from "@/src/lib/year-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = safeSearchQuery(params.get("q"));
  const kind = safeSearchKind(params.get("kind"));
  const year = params.get("year");
  const rawPage = Number(params.get("page") ?? "1");
  const page = Number.isInteger(rawPage) ? Math.max(1,Math.min(rawPage,100)) : 1;
  const intent = parseYearSearch(query,year);
  if (intent.title.length < 2 && !intent.yearOnly) {
    return Response.json({
      query,kind,page,year:intent.year,yearOnly:false,catalog:[],
      catalogHasMore:false,status:"ok",
    },{headers:{"Cache-Control":"no-store"}});
  }
  try {
    const data = await searchLibrary({query,kind,year,page});
    return Response.json(data,{
      status:data.status==="unavailable"?503:200,
      headers:{"Cache-Control":data.status==="unavailable"
        ? "no-store" : "public, s-maxage=30, stale-while-revalidate=60"},
    });
  } catch(error) {
    console.error("PinFlix release-year search failed",error);
    return Response.json({error:"Search is temporarily unavailable"},{
      status:503,headers:{"Cache-Control":"no-store"},
    });
  }
}
