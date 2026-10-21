import {describe,it,expect} from 'vitest';
import {writeFileSync,mkdirSync} from 'node:fs';
import {search} from '../src/lib/cineplex/search';
import {series} from '../src/lib/cineplex/series';
import {movie} from '../src/lib/cineplex/movies';
import {categories} from '../src/lib/cineplex/categories';
const live = process.env.CINEPLEX_LIVE === '1';
const report: Record<string,unknown> = {};
describe.skipIf(!live)('opt-in live CineplexBD verification',()=>{
 for(const q of ['Avatar','Inception','Breaking Bad','বাংলা']) it('searches '+q,async()=>{const result=await search({q});report[q]={count:result.items.length,page:result.page,hasNextPage:result.hasNextPage,items:result.items.slice(0,4)};expect(result.items.every(item=>item.provider==='cineplexbd')).toBe(true);if(q!=='বাংলা') expect(result.items.length).toBeGreaterThan(0);},30000);
 it('discovers actual sparse episode links and seasons',async()=>{const result=await series('10306',1);report.series={title:result.item.title,seasons:result.seasons,episodes:result.episodes};expect(result.seasons.length).toBeGreaterThan(0);expect(result.episodes.some(item=>item.number===1)).toBe(true);},30000);
 it('loads movie details and taxonomy',async()=>{report.movie=await movie('40804');const taxonomy=await categories();report.taxonomy={source:taxonomy.source,count:taxonomy.categories.length};expect(taxonomy.categories.length).toBeGreaterThan(10);mkdirSync('.cineplex-verification',{recursive:true});writeFileSync('.cineplex-verification/live-results.json',JSON.stringify(report,null,2));},30000);
});
