"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Title } from "@/src/lib/source-ui";
import { SavedToggle } from "@/src/components/saved-toggle";
import { toSavedTitle } from "@/src/lib/source-ui";
import { Artwork } from "./artwork";
function hashAccent(src: string) {
  let hash = 0;
  for (let i = 0; i < src.length; i++)
    hash = (hash * 31 + src.charCodeAt(i)) >>> 0;
  const r = 100 + (hash % 100);
  const g = 110 + ((hash >> 4) % 90);
  const b = 130 + ((hash >> 8) % 80);
  return `${r}, ${g}, ${b}`;
}

export function useAccent(src: string | null) {
  const [accent, setAccent] = useState(() =>
    src && src.includes("image.tmdb.org") ? hashAccent(src) : "136, 181, 150",
  );
  useEffect(() => {
    if (!src || src.includes("image.tmdb.org")) return;
    let cancelled = false;
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onerror = () => {};
    im.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 12;
        c.height = 12;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(im, 0, 0, 12, 12);
        const px = ctx.getImageData(0, 0, 12, 12).data;
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i] + px[i + 1] + px[i + 2] > 100) {
            r += px[i];
            g += px[i + 1];
            b += px[i + 2];
            n++;
          }
        }
        if (n && !cancelled)
          setAccent(
            [r, g, b]
              .map((v) => Math.min(220, Math.max(95, Math.round(v / n))))
              .join(", "),
          );
      } catch {}
    };
    im.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return accent;
}
export function SaveButton({ title }: { title: Title }) {
  return <SavedToggle item={toSavedTitle(title)} className="secondary" />;
}
export function Hero({ titles }: { titles: Title[] }) {
  const [selected, setSelected] = useState(0);
  const t = titles[selected];
  const accent = useAccent(t?.poster || null);
  if (!t)
    return (
      <section className="hero empty">
        <h1>Your next story awaits.</h1>
        <p>
          The catalogue is temporarily unavailable. Please try again shortly.
        </p>
      </section>
    );
  return (
    <section
      className="hero"
      style={{ "--accent": accent } as React.CSSProperties}
    >
      <div className="hero-art">
        <Artwork src={t.backdrop || t.poster} alt="" priority />
      </div>
      <div className="hero-shade" />
      <div className="hero-copy">
        <p className="eyebrow">
          <span className="live-dot" /> THE PINFLIX SPOTLIGHT
        </p>
        <div className="hero-meta">
          <span>{t.kind === "series" ? "SERIES" : "FILM"}</span>
          <span>{t.year}</span>
          <span>{t.quality || t.category}</span>
        </div>
        <h1>{t.title}</h1>
        <p className="hero-synopsis">
          {t.synopsis || [t.category, t.language].filter(Boolean).join(" · ")}
        </p>
        <div className="actions">
          <Link
            href={"/entertainment/" + encodeURIComponent(t.id)}
            className="primary"
          >
            Explore the story <ArrowUpRight size={19} />
          </Link>
          <SaveButton title={t} />
        </div>
      </div>
      <div className="hero-bottom">
        <span className="hero-footnote">STORIES WORTH STAYING IN FOR</span>
        <div className="hero-pages">
          {titles.map((x, i) => (
            <button
              key={x.id}
              aria-label={"Feature " + x.title}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
            >
              <span>0{i + 1}</span>
              <i className={selected === i ? "on" : ""} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
