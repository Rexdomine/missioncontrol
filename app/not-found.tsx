import Link from "next/link";

export default function NotFound() {
  return (
    <main className="loading-shell">
      <div className="loading-card">
        <p className="eyebrow">Mission Control</p>
        <h1>Route not found</h1>
        <p>
          That surface does not exist in Phase 1. Return to the dashboard and keep
          the app state grounded.
        </p>
        <Link className="not-found-link" href="/">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
