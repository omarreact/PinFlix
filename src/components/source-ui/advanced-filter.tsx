"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
export type AdvancedValues = {
  title: string;
  genres: string;
  actor: string;
  category: string;
  years: string[];
};
export function AdvancedFilter({
  initial,
  categories,
  onApply,
  onClose,
}: {
  initial: AdvancedValues;
  categories: string[];
  onApply: (value: AdvancedValues) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const titleInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleInput.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  const years = Array.from(
    { length: new Date().getUTCFullYear() - 1900 + 1 },
    (_, i) => String(new Date().getUTCFullYear() - i),
  );
  return (
    <div
      className="advanced-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-heading"
        className="advanced-panel"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "Tab") {
            const elements = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                "button,input,select",
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
          <h2 id="advanced-heading">ADVANCED FILTER</h2>
          <button
            type="button"
            aria-label="Close advanced filter"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onApply(draft);
          }}
        >
          <label>
            TITLE
            <input
              ref={titleInput}
              aria-label="Advanced title"
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
            />
          </label>
          <label>
            GENRE
            <input
              aria-label="Advanced genres"
              placeholder="e.g. Action, Adventure"
              value={draft.genres}
              onChange={(event) =>
                setDraft({ ...draft, genres: event.target.value })
              }
            />
          </label>
          <label>
            ACTORS
            <input
              aria-label="Advanced actors"
              value={draft.actor}
              onChange={(event) =>
                setDraft({ ...draft, actor: event.target.value })
              }
            />
          </label>
          <label>
            CATEGORY
            <select
              aria-label="Advanced category"
              value={draft.category}
              onChange={(event) =>
                setDraft({ ...draft, category: event.target.value })
              }
            >
              <option value="">Show All</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>RELEASE YEAR</legend>
            <div className="advanced-years">
              {years.map((year) => (
                <label key={year}>
                  <input
                    type="checkbox"
                    checked={draft.years.includes(year)}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        years: event.target.checked
                          ? [...draft.years, year]
                          : draft.years.filter((value) => value !== year),
                      })
                    }
                  />
                  {year}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="advanced-scope">
            Filters check verified metadata in the provider results on each
            page.
          </p>
          <footer>
            <button type="button" onClick={onClose}>
              CANCEL
            </button>
            <button type="submit">APPLY FILTER</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
