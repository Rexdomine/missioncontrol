"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveModule, sidebarItems } from "./mission-control-data";

export function MissionControlLayout({
  children,
  hero,
}: {
  children: React.ReactNode;
  hero: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeModule = getActiveModule(pathname);

  return (
    <div className="mission-app">
      <aside className="sidebar-panel">
        <div className="brand-block">
          <p className="eyebrow">StarLord OS</p>
          <h1>Mission Control</h1>
          <p className="brand-copy">
            Visual operations center for planning, execution, and direct work with
            StarLord.
          </p>
        </div>

        <nav aria-label="Primary" className="sidebar-nav">
          {sidebarItems.map((item) => (
            <Link
              className={`sidebar-link${item.key === activeModule ? " active" : ""}`}
              href={item.href}
              key={item.key}
            >
              <span>{item.label}</span>
              <em>{item.status === "live" ? "Live" : "Queued"}</em>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="eyebrow">Operator State</p>
          <div className="status-card">
            <strong>Rex</strong>
            <span>Africa/Lagos</span>
          </div>
          <div className="status-card">
            <strong>StarLord</strong>
            <span>Phase 2 operations pass active</span>
          </div>
        </div>
      </aside>

      <main className="workspace-panel">
        {hero}
        {children}
      </main>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  copy,
  metrics,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  metrics: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="hero-banner">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="hero-copy">{copy}</p>
      </div>
      <div className="hero-metrics">
        {metrics.map((metric) => (
          <div className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function EmptyModuleState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: string;
}) {
  return (
    <section className="content-grid single-column">
      <div className="primary-column">
        <article className="panel-card">
          <header className="section-header">
            <div>
              <p className="eyebrow">Phase 1</p>
              <h2>{title}</h2>
            </div>
          </header>
          <div className="empty-state-card">
            <p>{body}</p>
            <span>{action}</span>
          </div>
        </article>
      </div>
    </section>
  );
}
