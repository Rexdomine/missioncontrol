"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  ActivityEvent,
  AgentStatus,
  AgendaItem,
  AlertItem,
  ApprovalItem,
  ChatThread,
  ContinuityRecord,
  FocusItem,
  OperatingTask,
  ProjectPulseItem,
  SkillRegistryItem,
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
            {item.href ? (
              <Link className="card-link" href={item.href}>
                <div className="focus-topline">
                  <h3>{item.title}</h3>
                  <span>{item.tag}</span>
                </div>
                <p>{item.detail}</p>
              </Link>
            ) : (
              <>
                <div className="focus-topline">
                  <h3>{item.title}</h3>
                  <span>{item.tag}</span>
                </div>
                <p>{item.detail}</p>
              </>
            )}
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
            {item.href ? (
              <Link className="agenda-link" href={item.href}>
                <time>{item.time}</time>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.note}</p>
                </div>
              </Link>
            ) : (
              <>
                <time>{item.time}</time>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.note}</p>
                </div>
              </>
            )}
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
            {project.href ? (
              <Link className="card-link" href={project.href}>
                <div className="pulse-topline">
                  <h3>{project.name}</h3>
                  <span>{project.status}</span>
                </div>
                <p>{project.next}</p>
              </Link>
            ) : (
              <>
                <div className="pulse-topline">
                  <h3>{project.name}</h3>
                  <span>{project.status}</span>
                </div>
                <p>{project.next}</p>
              </>
            )}
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

export function AgentOperationsSection({ agents }: { agents: AgentStatus[] }) {
  return (
    <article className="panel-card agent-ops-panel">
      <SectionHeader
        detail="A command-center view of what each agent is doing, what changed last, and what happens next."
        eyebrow="Agents"
        title="Operations center"
      />
      <div className="agent-grid">
        {agents.map((agent) => (
          <div className="agent-card" key={agent.id}>
            <div className="agent-topline">
              <div>
                <p className="agent-role">{agent.role}</p>
                <h3>{agent.name}</h3>
              </div>
              <span className={`status-pill ${statusTone(agent.state, agent.risk)}`}>
                {agent.state}
              </span>
            </div>
            <p className="agent-project">{agent.project}</p>
            <p className="agent-task">{agent.currentTask}</p>
            <div className="agent-motion">
              <div>
                <span>Last action</span>
                <p>{agent.lastAction}</p>
              </div>
              <div>
                <span>Next action</span>
                <p>{agent.nextAction}</p>
              </div>
            </div>
            <div className="agent-telemetry">
              {agent.telemetry.map((item) => (
                <div className="mini-metric" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function OperatingTasksSection({ tasks }: { tasks: OperatingTask[] }) {
  return (
    <article className="panel-card">
      <SectionHeader
        detail="One readable queue for active, paused, monitoring, and ready lanes."
        eyebrow="Tasks"
        title="Work in motion"
      />
      <div className="ops-task-list">
        {tasks.map((task) => (
          <div className="ops-task-card" key={task.id}>
            <div className="ops-task-topline">
              <div>
                <p className="project-priority">{task.project}</p>
                <h3>{task.title}</h3>
              </div>
              <span className={`status-pill ${taskTone(task.lane)}`}>{task.lane}</span>
            </div>
            <p className="detail-copy">{task.summary}</p>
            <div className="ops-task-detail-grid">
              <div>
                <span>Owner</span>
                <strong>{task.owner}</strong>
              </div>
              <div>
                <span>Blocker</span>
                <strong>{task.blocker}</strong>
              </div>
              <div>
                <span>Next</span>
                <strong>{task.nextAction}</strong>
              </div>
            </div>
            <ul className="detail-list compact-list">
              {task.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </article>
  );
}

export function ActivityTimelineSection({ events }: { events: ActivityEvent[] }) {
  return (
    <article className="panel-card">
      <SectionHeader
        detail="A human-readable ledger for commands, repo moves, memory updates, deploy checks, and automations."
        eyebrow="Timeline"
        title="Recent operating events"
      />
      <div className="os-timeline">
        {events.map((event) => (
          <div className="os-timeline-item" key={event.id}>
            <time>{event.time}</time>
            <div>
              <div className="timeline-topline">
                <h3>{event.title}</h3>
                <span className="status-pill active">{event.type}</span>
              </div>
              <p>{event.detail}</p>
              <div className="thread-meta">
                {event.actor} · {event.artifact}
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function SkillsRegistrySection({ skills }: { skills: SkillRegistryItem[] }) {
  return (
    <article className="panel-card">
      <SectionHeader
        detail="The installed operating capabilities that shape how work gets executed."
        eyebrow="Skills"
        title="Capability registry"
      />
      <div className="skills-grid">
        {skills.map((skill) => (
          <div className="skill-card" key={skill.id}>
            <div className="skill-topline">
              <div>
                <p className="project-priority">{skill.category}</p>
                <h3>{skill.name}</h3>
              </div>
              <span className={`status-pill ${skillStatusTone(skill.status)}`}>
                {skill.status}
              </span>
            </div>
            <p>{skill.purpose}</p>
            <div className="thread-meta">Last used: {skill.lastUsed}</div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function ContinuitySection({ records }: { records: ContinuityRecord[] }) {
  return (
    <article className="panel-card accent-card">
      <SectionHeader
        detail="The current memory-backed truth Mission Control should resume from."
        eyebrow="Continuity"
        title="Memory and project state"
      />
      <div className="continuity-list">
        {records.map((record) => (
          <div className="continuity-card" key={record.id}>
            <div className="continuity-head">
              <h3>{record.label}</h3>
              <span>{record.source}</span>
            </div>
            <p>{record.state}</p>
            <strong>{record.next}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function statusTone(state: AgentStatus["state"], risk: AgentStatus["risk"]) {
  if (state === "Paused" || risk === "High") {
    return "risk";
  }
  if (state === "Monitoring" || risk === "Medium") {
    return "warning";
  }
  return "active";
}

function taskTone(lane: OperatingTask["lane"]) {
  if (lane === "Paused") {
    return "risk";
  }
  if (lane === "Monitoring") {
    return "warning";
  }
  return "active";
}

function skillStatusTone(status: SkillRegistryItem["status"]) {
  if (status === "Needs attention") {
    return "risk";
  }
  if (status === "Queued") {
    return "waiting";
  }
  return "good";
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
