"use client";
import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import type { DigitalItem } from "@/src/lib/digital-collections";
export function DigitalCollection({
  title,
  action,
  items,
}: {
  title: string;
  action: string;
  items: DigitalItem[];
}) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) =>
    `${item.title} ${item.description} ${item.category}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="page-content browse-page">
      <div className="page-title">
        <p className="eyebrow">EXPLORE AND LEARN</p>
        <h1>{title}</h1>
        <p>
          Downloads and learning resources.
        </p>
      </div>
      <label className="browse-search digital-search">
        <Search size={20} />
        <input
          aria-label={`Search ${title.toLowerCase()}`}
          placeholder={`Search ${title.toLowerCase()}…`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="digital-grid">
        {filtered.map((item) => (
          <article key={item.url}>
            <p className="eyebrow">{item.category}</p>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <a
              className="primary"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {action}
              <ArrowUpRight size={17} />
            </a>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty">
          <h2>No matches</h2>
          <button
            className="secondary"
            type="button"
            onClick={() => setQuery("")}
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
