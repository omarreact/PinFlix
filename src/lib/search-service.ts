import "server-only";
import { catalogProvider } from "@/src/lib/providers/catalog";
import { tmdbFetch, tmdbItemToEntertainment } from "@/src/lib/tmdb";
import { hideProviderDuplicates, rankSearch, safeSearchKind, safeSearchQuery, safeSearchSource, type SearchKind, type SearchSource } from "@/src/lib/search-ranking";
import type { Entertainment } from "@/src/types/catalog";

type TmdbResult = {
  id:number; media_type?:"movie"|"tv"|"person";title?:string;name?:string;
  overview?:string;poster_path?:string|null;backdrop_path?:string|null;
  release_date?:string;first_air_date?:string;vote_average?:number;vote_count?:number;
};
type TmdbResponse = {results:TmdbResult[];page:number;total_pages:number;total_results:number};
export type SearchResultSet = {
  query:string;kind:SearchKind;source:SearchSource;page:number;
  catalog:Entertainment[];discovery:Entertainment[];
  catalogHasMore:boolean;discoveryHasMore:boolean;
  discoveryTotal:number;
  tmdbConfigured:boolean;
  warnings:string[];
};

export async function searchLibrary(input:{
  query:string;kind?:SearchKind;source?:SearchSource;page?:number;
}):Promise<SearchResultSet> {
  const query=safeSearchQuery(input.query);
  const kind=safeSearchKind(input.kind);
  const source=safeSearchSource(input.source);
  const page=Number.isInteger(input.page) ? Math.max(1, Math.min(100,input.page!)) : 1;
  const configured=Boolean(process.env.TMDB_READ_ACCESS_TOKEN?.trim()||process.env.TMDB_API_KEY?.trim());
  const empty:SearchResultSet={query,kind,source,page,catalog:[],discovery:[],
    catalogHasMore:false,discoveryHasMore:false,discoveryTotal:0,tmdbConfigured:configured,warnings:[]};
  if(query.length<2) return empty;

  const catalogPromise=source==="tmdb" ? Promise.resolve([] as Entertainment[]) : catalogProvider.search(query,page);
  const tmdbPromise:Promise<TmdbResponse|null>=source==="catalog"||!configured ? Promise.resolve(null)
    :tmdbFetch<TmdbResponse>("/search/multi",
      {query,page,language:"en-US",include_adult:false},45).catch(()=>null);

  const [catalogRaw,tmdbData]=await Promise.all([catalogPromise,tmdbPromise]);
  const catalog=rankSearch(catalogRaw,query,kind);
  const tmdbRaw=(tmdbData?.results??[])
    .filter(item=>item.media_type==="movie"||item.media_type==="tv")
    .map(item=>tmdbItemToEntertainment(item,item.media_type as "movie"|"tv"));
  const discoveries=rankSearch(tmdbRaw,query,kind);
  const discovery=source==="tmdb" ? discoveries : hideProviderDuplicates(discoveries,catalog);
  const warnings:string[]=[];
  if(configured && source!=="catalog"&&!tmdbData) warnings.push("TMDB discovery is temporarily unavailable; provider catalog search remains available.");
  return {
    ...empty,catalog,discovery,discoveryTotal:tmdbData?.total_results ?? 0,
    catalogHasMore:catalogRaw.length>=30,discoveryHasMore:Boolean(tmdbData&&page<Math.min(tmdbData.total_pages,100)),
    warnings,
  };
}
