import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty error-page">
      <h1>A story we couldn’t find.</h1>
      <p>This title is unavailable or its link has changed.</p>
      <Link className="primary" href="/">
        Discover more stories
      </Link>
    </div>
  );
}
