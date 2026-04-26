export default function Loading() {
  return (
    <main className="loading-shell" aria-busy="true" aria-live="polite">
      <div className="loading-card">
        <p className="eyebrow">Mission Control</p>
        <h1>Loading workspace</h1>
        <p>Preparing the active workspace, connected modules, and route state.</p>
      </div>
    </main>
  );
}
