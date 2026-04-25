"use client";

import { useState } from "react";
import type {
  AgendaItem,
  AlertItem,
  ApprovalItem,
  ChatThread,
  FocusItem,
  ProjectPulseItem,
} from "./mission-control-data";

export function SectionHeader({
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

export function FocusSection({ items }: { items: FocusItem[] }) {
  return (
    <article className="panel-card">
      <SectionHeader
        detail="The work that should shape the day, not just fill it."
        eyebrow="Today"
        title="Focus now"
      />
      <div className="focus-stack">
        {items.map((item) => (
          <div className="focus-card" key={item.id}>
            <div className="focus-topline">
              <h3>{item.title}</h3>
              <span>{item.tag}</span>
            </div>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export function AgendaSection({ items }: { items: AgendaItem[] }) {
  return (
    <article className="panel-card">
      <SectionHeader
        detail="Connect real calendar commitments to execution decisions."
        eyebrow="Agenda"
        title="Time-aware plan"
      />
      <div className="agenda-list">
        {items.map((item) => (
          <div className="agenda-item" key={item.id}>
            <time>{item.time}</time>
            <div>
              <h3>{item.title}</h3>
              <p>{item.note}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function ProjectPulseSection({
  projects,
}: {
  projects: ProjectPulseItem[];
}) {
  return (
    <article className="panel-card">
      <SectionHeader
        detail="Enough project visibility to drive decisions before the full module lands."
        eyebrow="Projects"
        title="Project pulse"
      />
      <div className="pulse-grid">
        {projects.map((project) => (
          <div className="pulse-card" key={project.id}>
            <div className="pulse-topline">
              <h3>{project.name}</h3>
              <span>{project.status}</span>
            </div>
            <p>{project.next}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export function CommandSection({ actions }: { actions: string[] }) {
  const [prompt, setPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState<string | null>(null);

  return (
    <article className="panel-card accent-card">
      <SectionHeader
        detail="Base control surface for planning and direct execution."
        eyebrow="Chat"
        title="Command StarLord"
      />
      <div className="command-box">
        <p className="prompt-line">What do you want StarLord to handle next?</p>
        <div className="command-form">
          <input
            aria-label="Ask StarLord"
            className="command-text-input"
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask StarLord"
            value={prompt}
          />
          <button onClick={() => setSubmittedPrompt(prompt.trim())} type="button">
            Run
          </button>
        </div>
        {submittedPrompt ? (
          <p className="command-feedback">
            Command staged: <strong>{submittedPrompt}</strong>
          </p>
        ) : (
          <p className="command-feedback muted">
            Phase 1 keeps actions local and stateful. Live execution wiring lands
            next.
          </p>
        )}
      </div>
      <div className="quick-action-list">
        {actions.map((action) => (
          <button
            className="quick-action"
            key={action}
            onClick={() => setSubmittedPrompt(action)}
            type="button"
          >
            {action}
          </button>
        ))}
      </div>
    </article>
  );
}

export function ApprovalsSection({
  approvals,
  alerts,
}: {
  approvals: ApprovalItem[];
  alerts: AlertItem[];
}) {
  const [items, setItems] = useState(approvals);

  function resolveItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <article className="panel-card">
      <SectionHeader
        detail="Operational friction should surface here before it leaks into chat."
        eyebrow="Approvals"
        title="Approvals and alerts"
      />
      <div className="approval-list">
        {items.length ? (
          items.map((item) => (
            <div className="approval-card" key={item.id}>
              <div className="approval-topline">
                <h3>{item.title}</h3>
                <span>{item.severity}</span>
              </div>
              <p className="approval-source">{item.source}</p>
              <p>{item.action}</p>
              <div className="approval-actions">
                <button onClick={() => resolveItem(item.id)} type="button">
                  Mark resolved
                </button>
                <button className="secondary" type="button">
                  Escalate
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state-card compact">
            <p>No active approvals. This queue is clear.</p>
          </div>
        )}
        {alerts.map((alert) => (
          <div className="alert-card" key={alert.id}>
            <div className="approval-topline">
              <h3>{alert.title}</h3>
              <span>{alert.type}</span>
            </div>
            <p>{alert.body}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export function ThreadsSection({ threads }: { threads: ChatThread[] }) {
  const [activeId, setActiveId] = useState(threads[0]?.id ?? "");
  const activeThread = threads.find((thread) => thread.id === activeId) ?? threads[0];

  return (
    <article className="panel-card">
      <SectionHeader
        detail="Base chat history surface before deeper thread management arrives."
        eyebrow="Threads"
        title="Recent StarLord contexts"
      />
      <div className="thread-layout">
        <div className="thread-list">
          {threads.map((thread) => (
            <button
              className={`thread-card selectable${
                thread.id === activeThread?.id ? " selected" : ""
              }`}
              key={thread.id}
              onClick={() => setActiveId(thread.id)}
              type="button"
            >
              <div className="thread-topline">
                <h3>{thread.title}</h3>
                <span>{thread.status}</span>
              </div>
              <p>{thread.summary}</p>
            </button>
          ))}
        </div>
        {activeThread ? (
          <div className="thread-detail">
            <p className="eyebrow">Selected Thread</p>
            <h3>{activeThread.title}</h3>
            <p>{activeThread.summary}</p>
            <div className="thread-meta">Status: {activeThread.status}</div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
