import Link from "next/link";

export default function NotFound() {
  return (
    <main className="loading-shell">
      <div className="loading-card">
        <p className="eyebrow">Mission Control · Failure state</p>
        <h1>Route not found</h1>
        <p>
          That surface is not available in the current workspace. The safest
          recovery path is to return to a known module with preserved context.
        </p>
        <div className="failure-action-row">
          <Link className="not-found-link" href="/">
            Back to dashboard
          </Link>
          <Link className="not-found-link secondary" href="/trust">
            Open trust layer
          </Link>
        </div>
      </div>
    </main>
  );
}
