import "server-only";
import { parseCineplexTaxonomy } from '@/src/lib/providers/cineplexbd/categories';
import { requestSource } from './client';
export async function categories() { return parseCineplexTaxonomy(await requestSource('/search.php', 3600)); }
