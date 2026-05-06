import {
  activityTimeline,
  agentStatuses,
  commandRunbooks,
  connectorHealthSummaries,
  continuityRecords,
  dispatchQueue,
  multiStepWorkflows,
  operatingTasks,
  publicationPipeline,
  readinessGates,
  recommendationItems,
  skillRegistry,
  trustSignals,
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
          copy="Agent OS Phase 6 keeps orchestration intact while adding the polish, mobile readiness, provenance, and auditability needed for daily trust."
          eyebrow="Agent OS"
          metrics={[
            { label: "Active agents", value: String(activeAgents) },
            { label: "Trust signals", value: String(trustSignals.length) },
            { label: "Recommendations", value: String(recommendationItems.length) },
          ]}
          title="Agent OS now feels dependable enough for daily command-center use."
        />
      }
    >
      <section className="content-grid agent-os-grid">
        <div className="primary-column">
          <AgentOperationsSection agents={agentStatuses} />
          <ReadinessGatesSection gates={readinessGates} />
          <CommandRunbooksSection runbooks={commandRunbooks} />
          <article className="panel-card phase-three-summary-panel">
            <p className="eyebrow">Phase 6 trust layer</p>
            <h2>Mission Control now exposes provenance, auditability, and responsive polish.</h2>
            <p>
              The trust layer adds confidence indicators, action logs, explicit state
              feedback, and phone/laptop readiness cues on top of the Phase 5
              orchestration command center.
            </p>
            <div className="health-snapshot-grid">
              <div>
                <span>Trust signals</span>
                <strong>{trustSignals.length}</strong>
              </div>
              <div>
                <span>Workflows</span>
                <strong>{multiStepWorkflows.length}</strong>
              </div>
              <div>
                <span>Health watches</span>
                <strong>{unhealthyWorkflows}</strong>
              </div>
            </div>
            <div className="phase-three-link-row">
              <Link className="detail-link" href="/trust">
                Open Trust Layer
              </Link>
              <Link className="detail-link" href="/orchestration">
                Open Orchestration Layer
              </Link>
              <Link className="detail-link" href="/approvals">
                Open Workflow Health
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
