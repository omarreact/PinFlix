import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, ArrowRight, Film, ShieldCheck } from "lucide-react";
import { AdultAgeGate } from "@/src/components/adult-age-gate";
import { EntertainmentGrid } from "@/src/components/catalog-sections";
import { catalogueHref, filterCatalogue, parseCatalogueKind, type CatalogueKind } from "@/src/lib/catalogue";
import { catalogProvider } from "@/src/lib/providers/catalog";

export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";
type Params = Promise<{ kind?: string; page?: string }>;
const kindTabs: { value: CatalogueKind; label: string }[] = [
  { value: "all", label: "All titles" },
  { value: "movie", label: "Movies" },
  { value: "show", label: "TV Shows" },
];

export default async function AdultCataloguePage({ searchParams }: { searchParams: Params }) {
  // Never fetch or send restricted titles/posters before consent is recorded.
  const cookieStore = await cookies();
  if (cookieStore.get("pinflix-adult-age-ack")?.value !== "confirmed") {
    return <AdultAgeGate />;
  }

  const params = await searchParams;
  const kind = parseCatalogueKind(params.kind);
  const rawPage = Number(params.page ?? "1");
  const page = Number.isInteger(rawPage) ? Math.min(30, Math.max(1, rawPage)) : 1;
  const kinds = kind === "all" ? (["movie", "show"] as const) : ([kind] as const);

  // Scan a bounded two-page window per type using only the original provider.
  const results = await Promise.all(kinds.flatMap(type => [
    catalogProvider.getLatestPage(type, page * 2 - 1).catch(() => ({ items: [], page: page * 2 - 1, hasNextPage: false })),
    catalogProvider.getLatestPage(type, page * 2).catch(() => ({ items: [], page: page * 2, hasNextPage: false })),
  ]));
  const items = filterCatalogue(results.flatMap(result => result.items), kind, "adult");
  const hasMore = results.some((result, index) => index % 2 === 1 && result.hasNextPage);

  return <div className="space-y-8">
    <section>
      <Link href="/catalogue" className="media-focus inline-flex min-h-10 items-center gap-2 text-xs text-muted hover:text-fg"><ArrowLeft size={15}/> All catalogues</Link>
      <p className="pf-eyebrow mt-6 flex items-center gap-2"><ShieldCheck size={17}/> AGE CONFIRMED FOR THIS SESSION</p>
      <h1 className="pf-title mt-3">Adult <em className="pf-serif">18+.</em></h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
        Mature-audience titles explicitly labelled Adult, 18+ or Mature by the existing PinFlix provider.
        Only the current provider catalogue pages are searched; playback still depends on a valid source.
      </p>
    </section>
    <nav aria-label="Mature catalogue media type" className="flex flex-wrap gap-2 border-b border-line pb-6">
      {kindTabs.map(tab => <Link key={tab.value} href={catalogueHref(tab.value, "adult")}
        aria-current={kind === tab.value ? "page" : undefined}
        className={`media-focus inline-flex min-h-10 items-center rounded-md border px-4 text-xs font-semibold ${kind === tab.value ? "border-brand bg-brand text-bg" : "border-line bg-surface text-muted hover:text-fg"}`}>
        {tab.value === "movie" && <Film size={15} className="mr-2"/>}{tab.label}
      </Link>)}
    </nav>
    <section aria-label="Adult catalogue results" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{items.length} titles in this catalogue window</h2>
        <span className="text-xs text-muted">Page {page}</span>
      </div>
      {items.length ? <EntertainmentGrid items={items}/> : (
        <div className="glass-panel rounded-lg p-8 text-center">
          <p className="text-lg font-semibold text-fg">No Adult-labelled titles found on this page</p>
          <p className="mt-2 text-sm leading-7 text-muted">The provider may not publish Adult/18+ genre tags, or its latest pages may not contain matching entries. Titles are never invented or loaded from TMDB.</p>
        </div>
      )}
    </section>
    {(page > 1 || hasMore) && <nav aria-label="Adult catalogue pagination" className="pf-divider flex items-center justify-between gap-3 pt-6">
      {page > 1 ? <Link href={catalogueHref(kind,"adult",page-1)} className="pf-action pf-action-outline">← Previous</Link> : <span/>}
      {hasMore ? <Link href={catalogueHref(kind,"adult",page+1)} className="pf-action pf-action-outline">Next page <ArrowRight size={16}/></Link> : <span/>}
    </nav>}
  </div>;
}
