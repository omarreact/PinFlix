import Link from "next/link";
import { Info, MonitorDown, Play, Smartphone, Tv } from "lucide-react";
import type { Entertainment } from "@/src/types/catalog";

const appCards = [
  { label: "Mobile", icon: Smartphone },
  { label: "TV", icon: Tv },
  { label: "Desktop", icon: MonitorDown },
];

export function HomeHero({ item }: { item?: Entertainment }) {
  const image = item?.backdrop || item?.poster || "";

  return (
    <section className="overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_18px_55px_rgba(15,23,42,.08)]">
      <div className="relative min-h-[430px] overflow-hidden md:min-h-[470px]">
        {image ? (
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover md:object-right" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-100 via-white to-sky-100" />
        )}

        <div className="hero-gradient absolute inset-0" />

        <div className="relative grid min-h-[430px] items-end md:min-h-[470px] md:grid-cols-[1.05fr_.95fr] md:items-center">
          <div className="max-w-2xl p-6 sm:p-8 md:p-10 lg:p-12">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-brand">
              {item ? "Featured on PinFlix" : "PinFlix"}
            </p>
            <h1 className="mt-3 max-w-xl text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
              {item?.title || "Movies and web series, beautifully organized"}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
              {item?.year && <span>{item.year}</span>}
              {item?.genres.slice(0, 3).map((genre) => (
                <span key={genre} className="rounded-full bg-white/85 px-3 py-1 shadow-sm">{genre}</span>
              ))}
            </div>

            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              {item?.synopsis || "Discover newly added films and series in a clean, fast interface built around browsing and watching."}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {item ? (
                <>
                  <Link
                    href={`/watch/${item.id}`}
                    className="tv-focus inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white shadow-lg shadow-violet-200"
                  >
                    <Play size={18} fill="currentColor" />
                    Play
                  </Link>
                  <Link
                    href={`/entertainment/${item.slug}`}
                    className="tv-focus inline-flex min-h-12 items-center gap-2 rounded-xl border border-line bg-white/90 px-5 py-3 font-bold text-slate-800 shadow-sm"
                  >
                    <Info size={18} />
                    Details
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/movies" className="tv-focus rounded-xl bg-brand px-5 py-3 font-bold text-white">Browse movies</Link>
                  <Link href="/series" className="tv-focus rounded-xl border border-line bg-white px-5 py-3 font-bold text-slate-800">Browse web series</Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden md:block" />
        </div>
      </div>

      <div className="border-t border-line bg-slate-50/80 px-5 py-5 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">Take PinFlix with you</p>
            <p className="mt-1 text-xs text-muted">Mobile, TV and desktop apps are planned. The website remains fully usable in the meantime.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {appCards.map(({ label, icon: Icon }) => (
              <div key={label} className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 shadow-sm">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-brand">
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800">{label}</p>
                  <p className="text-[10px] text-muted">Coming soon</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
