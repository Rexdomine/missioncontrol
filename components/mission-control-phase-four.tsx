import {
  automationRunHistory,
  approvalAnomalyFeed,
  connectorHealthSummaries,
  severityAlerts,
} from "./mission-control-data";
import type {
  ApprovalAnomaly,
  AutomationRunHistoryItem,
  ConnectorHealthSummary,
  SeverityAlert,
} from "./mission-control-data";
import { SectionHeader } from "./mission-control-sections";

function severityTone(severity: ApprovalAnomaly["severity"] | SeverityAlert["severity"]) {
  if (severity === "Critical" || severity === "High") return "risk";
  if (severity === "Medium" || severity === "Warning") return "warning";
  return "good";
}

function healthTone(status: ConnectorHealthSummary["status"] | AutomationRunHistoryItem["result"]) {
  if (status === "Failing" || status === "Failed") return "risk";
  if (status === "Watch" || status === "Degraded" || status === "Waiting") return "warning";
  return "good";
}

export function WorkflowHealthModule() {
  const failingHealth = connectorHealthSummaries.filter((item) => item.status === "Failing").length;
  const watchHealth = connectorHealthSummaries.filter((item) => item.status === "Watch").length;
  const openAnomalies = approvalAnomalyFeed.filter((item) => item.status !== "Resolved").length;

  return (
    <section className="content-grid workflow-health-grid">
      <div className="primary-column">
        <article className="panel-card workflow-health-header">
          <SectionHeader
            detail="Phase 4 turns invisible automation state into a diagnostic header before stale approvals or broken connectors become workflow friction."
            eyebrow="Automation health"
            title="Approvals, alerts, and workflow health"
          />
          <div className="health-metric-grid">
            <div className="health-metric-card">
              <span>Connector failures</span>
              <strong>{failingHealth}</strong>
              <p>{watchHealth} watched connector or cron lane needs follow-up.</p>
            </div>
            <div className="health-metric-card">
              <span>Approval anomalies</span>
              <strong>{openAnomalies}</strong>
              <p>Stale prompts are grouped with source and remediation notes.</p>
            </div>
            <div className="health-metric-card">
              <span>Latest run</span>
              <strong>{automationRunHistory[0]?.result ?? "Unknown"}</strong>
              <p>{automationRunHistory[0]?.workflow ?? "No automation run recorded"}</p>
            </div>
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="Every alert is severity-ranked with the source and the operational action Rex should consider next."
            eyebrow="Alert severity feed"
            title="Issues before friction"
          />
          <div className="severity-feed">
            {severityAlerts.map((alert) => (
              <div className="severity-card" key={alert.id}>
                <div className="severity-rail">
                  <span className={`status-pill ${severityTone(alert.severity)}`}>{alert.severity}</span>
                  <time>{alert.time}</time>
                </div>
                <div>
                  <p className="project-priority">{alert.source}</p>
                  <h3>{alert.title}</h3>
                  <p>{alert.body}</p>
                  <strong>{alert.remediation}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card run-history-panel">
          <SectionHeader
            detail="Automation runs are recorded with trigger, result, evidence, and next action so failures do not disappear into chat history."
            eyebrow="Automation run history"
            title="Recent run ledger"
          />
          <div className="run-history-table" role="table" aria-label="Automation run history">
            <div className="run-history-row table-head" role="row">
              <span>Workflow</span>
              <span>Result</span>
              <span>Trigger</span>
              <span>Next action</span>
            </div>
            {automationRunHistory.map((run) => (
              <div className="run-history-row" key={run.id} role="row">
                <div>
                  <strong>{run.workflow}</strong>
                  <p>{run.startedAt} · {run.duration} · {run.source}</p>
                </div>
                <span className={`status-pill ${healthTone(run.result)}`}>{run.result}</span>
                <p>{run.trigger}</p>
                <p>{run.nextAction}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="secondary-column">
        <article className="panel-card">
          <SectionHeader
            detail="Approval cards now explain where noise came from and what cleans it up."
            eyebrow="Approval anomaly feed"
            title="Stale prompt diagnosis"
          />
          <div className="approval-anomaly-list">
            {approvalAnomalyFeed.map((item) => (
              <div className="approval-anomaly-card" key={item.id}>
                <div className="approval-topline">
                  <h3>{item.title}</h3>
                  <span className={`status-pill ${severityTone(item.severity)}`}>{item.severity}</span>
                </div>
                <p className="approval-source">{item.source} · detected {item.detectedAt} · stale {item.staleFor}</p>
                <p>{item.impact}</p>
                <div className="remediation-list">
                  <p className="eyebrow">Remediation notes</p>
                  <ul>
                    {item.remediationNotes.map((note) => <li key={note}>{note}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="Cron, connector, delivery, and runtime health are summarized together."
            eyebrow="Cron + connector health"
            title="Workflow readiness"
          />
          <div className="connector-health-list">
            {connectorHealthSummaries.map((item) => (
              <div className="connector-health-card" key={item.id}>
                <div className="control-card-head">
                  <div>
                    <p className="project-priority">{item.type}</p>
                    <h3>{item.name}</h3>
                  </div>
                  <span className={`status-pill ${healthTone(item.status)}`}>{item.status}</span>
                </div>
                <p>{item.summary}</p>
                <div className="connector-meta-grid">
                  <span>Last: {item.lastCheck}</span>
                  <span>Next: {item.nextCheck}</span>
                  <span>Owner: {item.owner}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
