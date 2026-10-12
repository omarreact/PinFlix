import Link from "next/link";
import { ArrowUpRight, Film } from "lucide-react";
import { titleHref } from "@/src/lib/source-ui";
import type { Title } from "@/src/lib/source-ui";
import { Artwork } from "./artwork";
export function Card({
  title: t,
  progress,
  subtitle,
  href,
}: {
  title: Title;
  progress?: number;
  subtitle?: string;
  href?: string;
}) {
  return (
    <Link className="card" href={href || titleHref(t)}>
      <div className="card-art">
        <Artwork src={t.poster} alt={t.title} />
        <span className="card-format">
          {t.quality || (t.kind === "series" ? "SERIES" : "MOVIE")}
        </span>
        <span className="card-hover">
          <ArrowUpRight />
        </span>
        {progress !== undefined && (
          <span className="progress-line">
            <i style={{ width: Math.min(100, progress) + "%" }} />
          </span>
        )}
      </div>
      <h3>{t.title}</h3>
      <p>
        {subtitle ? (
          subtitle
        ) : (
          <>
            {t.year || "Year unavailable"}
            <span>·</span>
            {t.category || (t.kind === "series" ? "Series" : "Movie")}
          </>
        )}
      </p>
    </Link>
  );
}
export function Row({
  title,
  kicker,
  items,
  href,
}: {
  title: string;
  kicker?: string;
  items: Title[];
  href?: string;
}) {
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          {kicker && <p className="eyebrow">{kicker}</p>}
          <h2>{title}</h2>
        </div>
        {href && (
          <Link className="text-button" href={href}>
            Explore <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
      {items.length ? (
        <div className="card-row">
          {items.map((t) => (
            <Card key={t.id} title={t} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <Film />
          <p>No titles are available in this collection yet.</p>
        </div>
      )}
    </section>
  );
}
