export default function Loading() {
  return (
    <div className="page-content skeleton-page" aria-label="Loading stories">
      <div className="skeleton hero-skeleton" />
      <div className="card-grid">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="skeleton poster-skeleton" />
        ))}
      </div>
    </div>
  );
}
