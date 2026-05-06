export default function Loading() {
  return (
    <main className="loading-shell" aria-busy="true" aria-live="polite">
      <div className="loading-card">
        <p className="eyebrow">Mission Control · Loading state</p>
        <h1>Preparing workspace context</h1>
        <p>Loading connected modules, trust indicators, and route state without losing the operating context.</p>
        <div className="loading-state-rail" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </main>
  );
}
