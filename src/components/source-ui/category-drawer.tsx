"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
import { SCREENSHOT_CATEGORIES } from "@/src/lib/screenshot-categories";
import { FRANCHISE_COLLECTIONS } from "@/src/lib/franchise-collections";
export function CategoryDrawer({ onClose }: { onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  function links(group: string) {
    return SCREENSHOT_CATEGORIES.filter(
      (category) => category.group === group && !["Bangla", "Documentary"].includes(category.name),
    ).map((category) => (
      <Link
        key={category.name}
        href={`/${category.kind === "series" ? "series" : "movies"}?category=${encodeURIComponent(category.name)}`}
        onClick={onClose}
      >
        {category.group === "Hindi Dubbed"
          ? category.name.split("/")[1]
          : category.name}
      </Link>
    ));
  }
  return (
    <div
      className="category-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        id="category-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Browse categories"
        className="category-drawer"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "Tab") {
            const elements = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                "button,a,summary",
              ),
            );
            const first = elements[0],
              last = elements.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header>
          <strong>COLLECTIONS</strong>
          <button
            ref={close}
            type="button"
            aria-label="Close categories"
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        <nav aria-label="Quick navigation">
          <Link href="/" onClick={onClose}>
            Discover
          </Link>
          <Link href="/library" onClick={onClose}>
            My space
          </Link>
        </nav>
        <details open>
          <summary>
            MOVIES
            <ChevronDown size={18} />
          </summary>
          <h3>CATEGORIES</h3>
          {links("Categories")}
          <h3>MARVEL &amp; DC</h3>
          {FRANCHISE_COLLECTIONS.map((category) => (
            <Link
              key={category.slug}
              href={`/catalogue?category=${category.label}`}
              onClick={onClose}
            >
              {category.label}
            </Link>
          ))}
          <h3>HINDI DUBBED</h3>
          {links("Hindi Dubbed")}
        </details>
        <details>
          <summary>
            TV SERIES
            <ChevronDown size={18} />
          </summary>
          <Link href="/series" onClick={onClose}>
            All TV Series
          </Link>
          <details className="nested">
            <summary>
              Animation Series
              <ChevronDown size={18} />
            </summary>
            {links("Animation Series")}
          </details>
          {SCREENSHOT_CATEGORIES.filter(
            (category) =>
              category.group === "TV Series" &&
              category.name !== "All TV Series",
          ).map((category) => (
            <Link
              key={category.name}
              href={`/series?category=${encodeURIComponent(category.name)}`}
              onClick={onClose}
            >
              {category.name}
            </Link>
          ))}
        </details>
        {["GAMES", "SOFTWARE", "TUTORIAL"].map((name) => (
          <details key={name}>
            <summary>
              {name}
              <ChevronDown size={18} />
            </summary>
            <Link
              href={`/collections/${name === "TUTORIAL" ? "tutorials" : name.toLowerCase()}`}
              onClick={onClose}
            >
              Browse {name.toLowerCase()}
            </Link>
          </details>
        ))}
      </aside>
    </div>
  );
}
