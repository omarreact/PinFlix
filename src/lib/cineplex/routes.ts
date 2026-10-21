import "server-only";
import { z } from 'zod';
import { search } from './search';
import { categories } from './categories';
import { movie } from './movies';
import { series } from './series';
import { health } from './health';
import { CineplexError } from './types';
const detailsSchema = z.object({id:z.string().regex(/^\d{1,12}$/),type:z.enum(['movie','series']).default('movie'),season:z.coerce.number().int().min(1).max(500).default(1)});
export async function handle(request: Request, action: string) {
  try {
    const input = Object.fromEntries([...new URL(request.url).searchParams].filter(([key,value]) => !['year','letter'].includes(key) || value !== ''));
    let result: unknown;
    if (['search','movies','series'].includes(action)) result = await search({...input,...(action === 'movies' ? {type:'movie' as const}:action === 'series' ? {type:'series' as const}:{})});
    else if (action === 'categories') result = await categories();
    else if (action === 'health') result = await health();
    else {
      const options = detailsSchema.parse({...input,...(action === 'seasons' || action === 'episodes' ? {type:'series'}:{})});
      result = options.type === 'series' ? await series(options.id,options.season) : await movie(options.id);
    }
    return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({error:'Invalid query parameters',code:'INVALID_INPUT',issues:error.issues}, {status:400});
    const failure = error instanceof CineplexError ? error : new CineplexError('INTERNAL_ERROR','Catalog request failed',500);
    return Response.json({error:failure.message,code:failure.code,provider:'cineplexbd'}, {status:failure.status,headers:{'Cache-Control':'no-store',...(failure.status === 429 ? {'Retry-After':'5'}:{})}});
  }
}
