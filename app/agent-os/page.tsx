import {
  activityTimeline,
  agentStatuses,
  approvalAnomalyFeed,
  automationRunHistory,
  commandRunbooks,
  connectorHealthSummaries,
  continuityRecords,
  dispatchQueue,
  operatingTasks,
  publicationPipeline,
  readinessGates,
  severityAlerts,
  skillRegistry,
} from "@/components/mission-control-data";
import Link from "next/link";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";
import {
  ActivityTimelineSection,
  AgentOperationsSection,
  CommandRunbooksSection,
  ContinuitySection,
  DispatchQueueSection,
  OperatingTasksSection,
  PublicationPipelineSection,
  ReadinessGatesSection,
  SkillsRegistrySection,
} from "@/components/mission-control-sections";

export default function AgentOSPage() {
  const activeAgents = agentStatuses.filter((agent) => agent.state === "Executing").length;
  const pausedTasks = operatingTasks.filter((task) => task.lane === "Paused").length;
  const readySkills = skillRegistry.filter((skill) => skill.status === "Ready").length;
  const unhealthyWorkflows = connectorHealthSummaries.filter((item) => item.status !== "Healthy").length;

  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Agent OS Phase 4 keeps execution controls and personal-growth pipelines visible while adding approvals, alerts, automation history, and workflow-health diagnostics."
          eyebrow="Agent OS"
          metrics={[
            { label: "Active agents", value: String(activeAgents) },
            { label: "Workflow watches", value: String(unhealthyWorkflows) },
            { label: "Alert signals", value: String(severityAlerts.length) },
          ]}
          title="Agent OS now exposes workflow health before failures become friction."
        />
      }
    >
      <section className="content-grid agent-os-grid">
        <div className="primary-column">
          <AgentOperationsSection agents={agentStatuses} />
          <ReadinessGatesSection gates={readinessGates} />
          <CommandRunbooksSection runbooks={commandRunbooks} />
          <article className="panel-card phase-three-summary-panel">
            <p className="eyebrow">Phase 4 workflow health</p>
            <h2>Approvals, alerts, and automation failures now have one diagnostic surface.</h2>
            <p>
              The approvals module now includes alert severity, automation run history,
              approval anomaly cards, and cron/connector health so stale noise and connector
              failures are visible before they block Rex.
            </p>
            <div className="health-snapshot-grid">
              <div>
                <span>Runs tracked</span>
                <strong>{automationRunHistory.length}</strong>
              </div>
              <div>
                <span>Anomalies</span>
                <strong>{approvalAnomalyFeed.length}</strong>
              </div>
              <div>
                <span>Health checks</span>
                <strong>{connectorHealthSummaries.length}</strong>
              </div>
            </div>
            <div className="phase-three-link-row">
              <Link className="detail-link" href="/approvals">
                Open Workflow Health
              </Link>
              <Link className="detail-link" href="/job-hunt">
                Open Job Hunt
              </Link>
              <Link className="detail-link" href="/content">
                Open Content
              </Link>
            </div>
          </article>
          <OperatingTasksSection tasks={operatingTasks} />
          <ActivityTimelineSection events={activityTimeline} />
        </div>
        <div className="secondary-column">
          <DispatchQueueSection items={dispatchQueue} />
          <PublicationPipelineSection items={publicationPipeline} />
          <ContinuitySection records={continuityRecords} />
          <SkillsRegistrySection skills={skillRegistry} />
          <div className="agent-os-summary-card">
            <p className="eyebrow">Phase 2 boundary</p>
            <h2>Controls are staged, not live-executing yet.</h2>
            <p>
              This slice keeps the Agent OS safe: commands, gates, and queues are
              rendered as typed operating state while real external execution still
              requires the existing chat/tool approval boundaries.
            </p>
            <strong>{pausedTasks} paused blocker kept visible · {readySkills} skills ready</strong>
          </div>
        </div>
      </section>
    </MissionControlLayout>
  );
}
