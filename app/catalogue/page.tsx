import Link from "next/link";
import { ArrowLeft, ArrowRight, Clapperboard, Film, Layers3 } from "lucide-react";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { catalogProvider } from "@/src/lib/providers/catalog";
import {
  availableGenres, catalogueHref, filterCatalogue,
  parseCatalogueGenre, parseCatalogueKind, type CatalogueKind,
} from "@/src/lib/catalogue";

export const revalidate = 120;
export const preferredRegion = "sin1";
type Params = Promise<{ kind?: string; genre?: string; page?: string }>;
const kindOptions: { kind: CatalogueKind; label: string }[] = [
  {kind: "all", label: "All titles"},
  {kind: "movie", label: "Movies"},
  {kind: "show", label: "TV Shows"},
];

export default async function CataloguePage({searchParams}:{searchParams:Params}) {
  const params = await searchParams;
  const kind = parseCatalogueKind(params.kind);
  const genre = parseCatalogueGenre(params.genre);
  const rawPage = Number(params.page ?? "1");
  const page = Number.isInteger(rawPage) ? Math.min(30, Math.max(1, rawPage)) : 1;
  // A catalogue page explores two consecutive provider pages for the requested
  // type. Genre filters are applied to returned provider genres, not to TMDB.
  const types = kind === "all" ? (["movie","show"] as const) : ([kind] as const);
  const results = await Promise.all(types.flatMap(type => [
    catalogProvider.getLatestPage(type, page * 2 - 1).catch(() => ({items:[],page:page*2-1,hasNextPage:false})),
    catalogProvider.getLatestPage(type, page * 2).catch(() => ({items:[],page:page*2,hasNextPage:false})),
  ]));
  const raw = results.flatMap(result => result.items);
  const items = filterCatalogue(raw, kind, genre);
  const allGenres = availableGenres(raw);
  const selectedGenre = allGenres.find(item => item.slug === genre);
  const canAdvance = results.some((result, index) => index % 2 === 1 && result.hasNextPage);
  const title = selectedGenre ? selectedGenre.label : kind === "movie" ? "Movies" : kind === "show" ? "TV Shows" : "Every kind of story";

  return <div className="space-y-8">
    <section>
      <Link href="/" className="media-focus inline-flex min-h-10 items-center gap-2 text-xs text-muted hover:text-fg"><ArrowLeft size={15}/> Home</Link>
      <p className="pf-eyebrow mt-6 flex items-center gap-2"><Layers3 size={16}/> FROM THE VIDEO CATALOGUE</p>
      <h1 className="pf-title mt-3">Browse <em className="pf-serif">{title}.</em></h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">Explore movies and TV shows using categories supplied by the PinFlix video provider. Genres are shown only when matching titles are found in the loaded catalogue pages.</p>
    </section>
    <section aria-label="Catalogue menus" className="space-y-4 border-b border-line pb-6">
      <div className="flex flex-wrap gap-2">
        {kindOptions.map(option=><Link key={option.kind} href={catalogueHref(option.kind, genre)}
          aria-current={kind === option.kind ? "page" : undefined}
          className={`media-focus inline-flex min-h-10 items-center gap-2 rounded-md border px-4 text-xs font-semibold ${kind === option.kind ? "border-brand bg-brand text-bg" : "border-line bg-surface text-muted hover:text-fg"}`}>
          {option.kind === "movie" ? <Film size={15}/> : option.kind === "show" ? <Clapperboard size={15}/> : <Layers3 size={15}/>}
          {option.label}
        </Link>)}
      </div>
      <nav aria-label="Browse by genre" className="flex flex-wrap gap-2">
        <Link href={catalogueHref(kind)} aria-current={!genre ? "page":undefined}
          className={`media-focus inline-flex min-h-9 items-center rounded-md px-3 text-xs font-semibold ${!genre ? "bg-elevated text-brand ring-1 ring-brand/40" : "text-muted hover:bg-surface hover:text-fg"}`}>All genres</Link>
        {allGenres.map(group=><Link key={group.slug} href={catalogueHref(kind,group.slug)}
          aria-current={genre === group.slug ? "page" : undefined}
          className={`media-focus inline-flex min-h-9 items-center rounded-md px-3 text-xs font-semibold ${genre === group.slug ? "bg-elevated text-brand ring-1 ring-brand/40" : "text-muted hover:bg-surface hover:text-fg"}`}>{group.label}</Link>)}
      </nav>
    </section>
    <section aria-label="Catalogue results" className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div><p className="pf-eyebrow">LATEST FROM THE PROVIDER</p><h2 className="mt-2 text-2xl font-medium">{items.length ? `${items.length} titles` : "No titles on this page"}</h2></div>
        <span className="text-xs text-muted">Catalogue page {page}</span>
      </div>
      {items.length ? <EntertainmentGrid items={items}/> : (
        <div className="glass-panel rounded-lg px-6 py-12 text-center text-sm text-muted">
          No matching titles in these recent provider pages. Try another genre or browse all titles.
          <div className="mt-5"><Link className="pf-action" href={catalogueHref(kind)}>All genres <ArrowRight size={16}/></Link></div>
        </div>
      )}
    </section>
    {(page > 1 || canAdvance) && <nav aria-label="Catalogue pagination" className="pf-divider flex justify-between gap-3 pt-6">
      {page > 1 ? <Link className="pf-action pf-action-outline" href={catalogueHref(kind,genre,page-1)}>← Previous</Link> : <span/>}
      {canAdvance ? <Link className="pf-action pf-action-outline" href={catalogueHref(kind,genre,page+1)}>More titles <ArrowRight size={16}/></Link> : <span/>}
    </nav>}
  </div>;
}
