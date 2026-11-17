"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="empty error-page">
      <h1>This story needs a moment.</h1>
      <p>We couldn’t load this page. Please try again.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
