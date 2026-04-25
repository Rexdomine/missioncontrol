import {
  alerts,
  agendaItems,
  approvalItems,
  chatThreads,
  focusItems,
  projectPulse,
  quickActions,
  sidebarItems,
} from "./mission-control-data";

function SectionHeader({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
}) {
  return (
    <header className="section-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {detail ? <p className="section-detail">{detail}</p> : null}
    </header>
  );
}

export function MissionControlShell() {
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

        <nav className="sidebar-nav" aria-label="Primary">
          {sidebarItems.map((item) => (
            <div
              className={`sidebar-link${item.active ? " active" : ""}`}
              key={item.label}
            >
              <span>{item.label}</span>
              <em>{item.state}</em>
            </div>
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
            <span>Phase 1 implementation active</span>
          </div>
        </div>
      </aside>

      <main className="workspace-panel">
        <section className="hero-banner">
          <div>
            <p className="eyebrow">Phase 1</p>
            <h2>Daily cockpit, approvals visibility, and the base command surface.</h2>
            <p className="hero-copy">
              The first working version is optimized for high-signal daily control:
              what matters now, what is blocked, and what StarLord should do next.
            </p>
          </div>
          <div className="hero-metrics">
            <div className="metric-card">
              <span>Focus Items</span>
              <strong>3</strong>
            </div>
            <div className="metric-card">
              <span>Agenda Items</span>
              <strong>{agendaItems.length}</strong>
            </div>
            <div className="metric-card">
              <span>Approvals / Alerts</span>
              <strong>{approvalItems.length + alerts.length}</strong>
            </div>
          </div>
        </section>

        <section className="content-grid">
          <div className="primary-column">
            <article className="panel-card">
              <SectionHeader
                eyebrow="Today"
                title="Focus now"
                detail="The work that should shape the day, not just fill it."
              />
              <div className="focus-stack">
                {focusItems.map((item) => (
                  <div className="focus-card" key={item.title}>
                    <div className="focus-topline">
                      <h3>{item.title}</h3>
                      <span>{item.tag}</span>
                    </div>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-card">
              <SectionHeader
                eyebrow="Agenda"
                title="Time-aware plan"
                detail="Connect real calendar commitments to execution decisions."
              />
              <div className="agenda-list">
                {agendaItems.map((item) => (
                  <div className="agenda-item" key={`${item.time}-${item.title}`}>
                    <time>{item.time}</time>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-card">
              <SectionHeader
                eyebrow="Projects"
                title="Project pulse"
                detail="Enough project visibility to drive decisions before the full module lands."
              />
              <div className="pulse-grid">
                {projectPulse.map((project) => (
                  <div className="pulse-card" key={project.name}>
                    <div className="pulse-topline">
                      <h3>{project.name}</h3>
                      <span>{project.status}</span>
                    </div>
                    <p>{project.next}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="secondary-column">
            <article className="panel-card accent-card">
              <SectionHeader
                eyebrow="Chat"
                title="Command StarLord"
                detail="Base control surface for planning and direct execution."
              />
              <div className="command-box">
                <p className="prompt-line">What do you want StarLord to handle next?</p>
                <div className="command-input">
                  <span>Ask StarLord</span>
                  <button type="button">Run</button>
                </div>
              </div>
              <div className="quick-action-list">
                {quickActions.map((action) => (
                  <button className="quick-action" key={action} type="button">
                    {action}
                  </button>
                ))}
              </div>
            </article>

            <article className="panel-card">
              <SectionHeader
                eyebrow="Approvals"
                title="Approvals and alerts"
                detail="Operational friction should surface here before it leaks into chat."
              />
              <div className="approval-list">
                {approvalItems.map((item) => (
                  <div className="approval-card" key={item.title}>
                    <div className="approval-topline">
                      <h3>{item.title}</h3>
                      <span>{item.severity}</span>
                    </div>
                    <p className="approval-source">{item.source}</p>
                    <p>{item.action}</p>
                  </div>
                ))}
                {alerts.map((alert) => (
                  <div className="alert-card" key={alert.title}>
                    <div className="approval-topline">
                      <h3>{alert.title}</h3>
                      <span>{alert.type}</span>
                    </div>
                    <p>{alert.body}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-card">
              <SectionHeader
                eyebrow="Threads"
                title="Recent StarLord contexts"
                detail="Base chat history surface before deeper thread management arrives."
              />
              <div className="thread-list">
                {chatThreads.map((thread) => (
                  <div className="thread-card" key={thread.title}>
                    <div className="thread-topline">
                      <h3>{thread.title}</h3>
                      <span>{thread.status}</span>
                    </div>
                    <p>{thread.summary}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
