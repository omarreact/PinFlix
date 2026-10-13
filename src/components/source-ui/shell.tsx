"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X, ArrowUpRight, Menu, Play } from "lucide-react";
import { toTitle, type Title, type Category } from "@/src/lib/source-ui";
import { Artwork } from "./artwork";
import { read, write } from "@/src/lib/source-ui-storage";
export function Shell({
  children,
}: {
  children: React.ReactNode;
  categories: Category[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Title[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const navigationOpener = useRef<HTMLButtonElement>(null);
  const searchOpener = useRef<HTMLButtonElement>(null);
  function closeSearch() {
    setOpen(false);
    searchOpener.current?.focus();
  }
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  function openSearch() {
    const r = read<unknown>("search", []);
    setRecent(
      Array.isArray(r)
        ? r.filter((x): x is string => typeof x === "string").slice(0, 8)
        : [],
    );
    setItems([]);
    setLoading(false);
    setOpen(true);
  }
  useEffect(() => {
    if (!open || q.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch("/api/search/live?q=" + encodeURIComponent(q), {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((d) => {
          if (!controller.signal.aborted)
            setItems((d.catalog || []).slice(0, 8).map(toTitle));
          setActive(-1);
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, open]);
  function search(value = q) {
    if (!value.trim()) return;
    write(
      "search",
      [value.trim(), ...recent.filter((x) => x !== value.trim())].slice(0, 8),
    );
    setOpen(false);
    setMenu(false);
    router.push("/search?q=" + encodeURIComponent(value));
  }
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="header">
        <Link href="/" className="brand" aria-label="PinFlix home">
          <span className="brand-mark">
            <Play size={15} fill="currentColor" />
          </span>
          pin<span>flix</span>
          <i />
        </Link>
        <nav
          id="main-navigation"
          aria-label="Main navigation"
          className={menu ? "nav-links mobile-open" : "nav-links"}
          onKeyDown={(event) => { if (event.key === "Escape") { setMenu(false); navigationOpener.current?.focus(); } }}
        >
          <Link
            href="/"
            onClick={() => {
              setMenu(false);
            }}
            className={pathname === "/" ? "active" : ""}
          >
            Discover
          </Link>
          <Link
            href="/movies"
            onClick={() => {
              setMenu(false);
            }}
            className={pathname === "/movies" ? "active" : ""}
          >
            Movies
          </Link>
          <Link
            href="/series"
            onClick={() => {
              setMenu(false);
            }}
            className={pathname === "/series" ? "active" : ""}
          >
            Series
          </Link>
          <Link
            href="/library"
            onClick={() => {
              setMenu(false);
            }}
            className={
              ["/library", "/saved", "/history"].includes(pathname)
                ? "active"
                : ""
            }
          >
            My space
          </Link>
        </nav>
        <div className="nav-right">
          <button
            aria-label="Search catalogue"
            ref={searchOpener}
            className="icon-button"
            onClick={openSearch}
          >
            <Search size={20} />
          </button>
          <button
            className="menu-toggle icon-button"
            ref={navigationOpener}
            aria-label="Toggle navigation"
            aria-expanded={menu}
            aria-controls="main-navigation"
            onClick={() => {
              setMenu(value => !value);
            }}
          >
            {menu ? <X /> : <Menu />}
          </button>

        </div>
      </header>
      <main
        id="content"
        className={
          pathname === "/credits" || pathname.startsWith("/catalogue/adult")
            ? "page-content browse-page"
            : undefined
        }
      >
        {children}
      </main>
      <footer className="footer">
        <Link href="/" className="brand">
          pin<span>flix</span>
          <i />
        </Link>
        <p>A world of stories. A space of your own.</p>
      </footer>
      {open && (
        <div
          className="search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Search catalogue"
          onKeyDown={(e) => {
            if (e.key === "Escape") closeSearch();
            if (e.key === "Tab") {
              const els = Array.from(
                e.currentTarget.querySelectorAll<HTMLElement>("button,input,a"),
              );
              const first = els[0],
                last = els.at(-1);
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <div className="search-panel">
            <div className="search-input">
              <Search />
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setItems([]);
                  setActive(-1);
                  setLoading(false);
                }}
                placeholder="Find your next story"
                aria-label="Search titles"
                role="combobox"
                aria-expanded={items.length > 0}
                aria-controls="suggestions"
                aria-activedescendant={
                  active >= 0 ? "suggestion-" + active : undefined
                }
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(items.length - 1, a + 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(-1, a - 1));
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (active >= 0 && items[active]) {
                      setOpen(false);
                      router.push(
                        "/entertainment/" +
                          encodeURIComponent(items[active].id),
                      );
                    } else search();
                  }
                }}
              />
              <button
                className="icon-button"
                aria-label="Close search"
                onClick={closeSearch}
              >
                <X />
              </button>
            </div>
            {loading && <p className="muted">Searching…</p>}
            <div id="suggestions" role="listbox">
              {items.map((t, i) => (
                <Link
                  id={"suggestion-" + i}
                  role="option"
                  aria-selected={active === i}
                  className={"suggestion " + (active === i ? "selected" : "")}
                  href={"/entertainment/" + encodeURIComponent(t.id)}
                  key={t.id}
                  onClick={closeSearch}
                >
                  <Artwork src={t.poster} alt={t.title} />
                  <div>
                    <strong>{t.title}</strong>
                    <small>
                      {t.year} · {t.kind === "series" ? "Series" : "Movie"} ·{" "}
                      {t.category}
                    </small>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
            </div>
            {q.length > 1 && (
              <button className="text-button" onClick={() => search()}>
                See all results for “{q}” <ArrowUpRight size={16} />
              </button>
            )}
            {!q && (
              <>
                <p className="eyebrow">RECENT SEARCHES</p>
                <div className="chips">
                  {recent.length ? (
                    recent.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setQ(s);
                          search(s);
                        }}
                      >
                        {s}
                      </button>
                    ))
                  ) : (
                    <p className="muted">
                      Search movies, series, languages or years.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
