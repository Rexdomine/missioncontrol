"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  contextualAssistantPanels,
  memoryAwareSummaries,
  multiStepWorkflows,
  orchestrationTimeline,
  recommendationItems,
  unifiedSearchItems,
  type MultiStepWorkflow,
  type RecommendationItem,
} from "./mission-control-data";
import { SectionHeader } from "./mission-control-sections";

function priorityTone(priority: RecommendationItem["priority"]) {
  if (priority === "P1") return "risk";
  if (priority === "P2") return "warning";
  return "good";
}

function stepTone(state: MultiStepWorkflow["steps"][number]["state"]) {
  if (state === "Blocked") return "risk";
  if (state === "Needs approval") return "warning";
  return "good";
}

export function OrchestrationLayerModule() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalizedQuery) return unifiedSearchItems.slice(0, 4);

    return unifiedSearchItems.filter((item) => {
      const haystack = [item.label, item.summary, item.module, ...item.keywords].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  const [selectedWorkflowId, setSelectedWorkflowId] = useState(multiStepWorkflows[0]?.id ?? "");
  const selectedWorkflow =
    multiStepWorkflows.find((workflow) => workflow.id === selectedWorkflowId) ?? multiStepWorkflows[0];

  return (
    <section className="content-grid orchestration-grid">
      <div className="primary-column">
        <article className="panel-card orchestration-command-panel">
          <SectionHeader
            detail="Search modules, memory, workflow health, and command surfaces from one operating bar."
            eyebrow="Unified command/search"
            title="Ask StarLord across Mission Control"
          />
          <div className="orchestration-search-box">
            <input
              aria-label="Search Mission Control"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search approvals, projects, roles, content, memory, or commands..."
              value={query}
            />
            <button type="button">Stage command</button>
          </div>
          <div className="search-result-grid">
            {results.length ? (
              results.map((item) => (
                <Link className="search-result-card" href={item.href} key={item.id}>
                  <p className="project-priority">{item.module}</p>
                  <h3>{item.label}</h3>
                  <p>{item.summary}</p>
                </Link>
              ))
            ) : (
              <div className="empty-state-card compact">
                <p>No module match yet. Try “connector”, “gallery”, “role”, or “workflow”.</p>
              </div>
            )}
          </div>
        </article>

        <article className="panel-card central-timeline-panel">
          <SectionHeader
            detail="Cross-module events are merged so Rex sees decisions, risks, memory, and next actions as one operating timeline."
            eyebrow="Central timeline"
            title="What changed across the system"
          />
          <div className="central-timeline">
            {orchestrationTimeline.map((item) => (
              <Link className="central-timeline-item" href={item.relatedHref} key={item.id}>
                <time>{item.time}</time>
                <div>
                  <div className="timeline-topline">
                    <p className="project-priority">{item.module}</p>
                    <span className="status-pill active">{item.signal}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="Workflow cards can be initiated from chat or contextual cards, while sensitive steps remain staged for approval."
            eyebrow="Multi-step workflows"
            title="Launch guided operations"
          />
          <div className="workflow-card-grid">
            {multiStepWorkflows.map((workflow) => (
              <button
                className={`workflow-launch-card${workflow.id === selectedWorkflow?.id ? " selected" : ""}`}
                key={workflow.id}
                onClick={() => setSelectedWorkflowId(workflow.id)}
                type="button"
              >
                <div className="control-card-head">
                  <div>
                    <p className="project-priority">From {workflow.initiatedFrom}</p>
                    <h3>{workflow.title}</h3>
                  </div>
                  <span>{workflow.steps.length} steps</span>
                </div>
                <p>{workflow.objective}</p>
              </button>
            ))}
          </div>
          {selectedWorkflow ? (
            <div className="selected-workflow-panel">
              <p className="eyebrow">Staged workflow</p>
              <h3>{selectedWorkflow.launchPrompt}</h3>
              <div className="workflow-step-list">
                {selectedWorkflow.steps.map((step, index) => (
                  <div className="workflow-step" key={step.label}>
                    <span>{index + 1}</span>
                    <strong>{step.label}</strong>
                    <em className={`status-pill ${stepTone(step.state)}`}>{step.state}</em>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </div>

      <div className="secondary-column">
        <article className="panel-card recommendation-tray-panel">
          <SectionHeader
            detail="Recommendations explain why an action matters by citing the modules that generated the signal."
            eyebrow="Recommendation tray"
            title="Best next actions"
          />
          <div className="recommendation-list">
            {recommendationItems.map((item) => (
              <div className="recommendation-card" key={item.id}>
                <div className="approval-topline">
                  <h3>{item.title}</h3>
                  <span className={`status-pill ${priorityTone(item.priority)}`}>{item.priority}</span>
                </div>
                <p>{item.why}</p>
                <strong>{item.action}</strong>
                <div className="source-chip-row">
                  {item.sourceModules.map((source) => <span key={source}>{source}</span>)}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="Memory-aware summaries distinguish durable truth from today’s transient dashboard state."
            eyebrow="Memory-aware summaries"
            title="Context StarLord should remember"
          />
          <div className="memory-summary-list">
            {memoryAwareSummaries.map((summary) => (
              <div className="memory-summary-card" key={summary.id}>
                <div className="approval-topline">
                  <h3>{summary.title}</h3>
                  <span>{summary.confidence}</span>
                </div>
                <p className="approval-source">{summary.source}</p>
                <p>{summary.summary}</p>
                <strong>{summary.nextUse}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="Assistant panels are embedded guidance that turns module context into a prompt Rex can run."
            eyebrow="Contextual assistants"
            title="Embedded StarLord guidance"
          />
          <div className="assistant-panel-list">
            {contextualAssistantPanels.map((panel) => (
              <div className="assistant-context-card" key={panel.id}>
                <p className="project-priority">{panel.module}</p>
                <h3>{panel.title}</h3>
                <p>{panel.guidance}</p>
                <strong>{panel.suggestedPrompt}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
