import "server-only";
import { z } from 'zod';
import { categories } from './categories';
import { requestSource, parseJson } from './client';
import { normalizeSearch } from './normalize';
import { parseCatalog, hasNextPage } from './parser';
export const searchSchema = z.object({q:z.string().trim().max(200).default(''), page:z.coerce.number().int().min(1).max(1000).default(1), type:z.enum(['all','movie','series']).default('all'), category:z.string().trim().max(160).default(''), year:z.coerce.number().int().min(1800).max(2200).optional(), sort:z.enum(['source','title','title-desc']).default('source'), genre:z.string().trim().max(120).default(''), letter:z.string().regex(/^[A-Za-z#]$/).optional(), mode:z.enum(['full','suggest']).default('full')});
export async function search(input: z.input<typeof searchSchema>) {
  const options = searchSchema.parse(input);
  let categoryType = options.type;
  if (!options.q && options.category && categoryType === 'all') {
    const taxonomy = await categories();
    const matches = taxonomy.categories.filter(item => item.categoryValue === options.category);
    if (matches.length && matches.every(item => item.endpoint === 'tcategory.php')) categoryType = 'series';
  }
  const params = new URLSearchParams({q:options.q, page:String(options.page)});
  let path = '/search.php?' + params;
  // Source category pages support browsing; query + category uses page-local filtering.
  if (!options.q && options.category) path = `/${categoryType === 'series' ? 'tcategory' : 'category'}.php?` + new URLSearchParams({category:options.category,page:String(options.page)});
  if (!options.q && !options.category && options.type === 'series') path = '/tcategory.php?' + new URLSearchParams({category:'Web Series',page:String(options.page)});
  const categoryBrowse = !options.q && (Boolean(options.category) || options.type === 'series');
  if (categoryBrowse) {
    const filtered = new URL(path, 'http://cineplexbd.net');
    if (options.year) filtered.searchParams.set('year',String(options.year));
    if (options.genre) filtered.searchParams.set('genre',options.genre);
    if (options.letter) filtered.searchParams.set('letter',options.letter.toUpperCase());
    path = filtered.pathname + filtered.search;
  }
  const suggestions = options.mode === 'suggest' && Boolean(options.q);
  const body = await requestSource(suggestions ? '/search_ajax.php?' + new URLSearchParams({q:options.q,limit:'8'}) : path, 60);
  let items = suggestions ? normalizeSearch(parseJson(body)) : parseCatalog(body);
  items = items.filter(item => (options.type === 'all' || item.kind === (options.type === 'series' ? 'show':'movie')) && (categoryBrowse || !options.year || item.year === options.year) && (!options.category || !options.q || item.category?.toLocaleLowerCase() === options.category.toLocaleLowerCase()));
  if (options.sort !== 'source') items.sort((a,b) => a.title.localeCompare(b.title, undefined, {sensitivity:'base'}) * (options.sort === 'title-desc' ? -1:1));
  return {provider:'cineplexbd', results:items, items, page:options.page, hasNextPage:!suggestions && hasNextPage(body,options.page,path), filtering:categoryBrowse ? 'source-category':'current-source-page', sorting: options.sort === 'source' ? 'source':'current-source-page', suggestions};
}
