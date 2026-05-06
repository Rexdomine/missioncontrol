import {
  activityTimeline,
  agentStatuses,
  commandRunbooks,
  connectorHealthSummaries,
  continuityRecords,
  dispatchQueue,
  multiStepWorkflows,
  operatingTasks,
  orchestrationTimeline,
  publicationPipeline,
  readinessGates,
  recommendationItems,
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
          copy="Agent OS Phase 5 connects execution controls, workflow health, memory, recommendations, and guided workflows into one orchestration layer."
          eyebrow="Agent OS"
          metrics={[
            { label: "Active agents", value: String(activeAgents) },
            { label: "Timeline signals", value: String(orchestrationTimeline.length) },
            { label: "Recommendations", value: String(recommendationItems.length) },
          ]}
          title="Agent OS now guides action across every Mission Control module."
        />
      }
    >
      <section className="content-grid agent-os-grid">
        <div className="primary-column">
          <AgentOperationsSection agents={agentStatuses} />
          <ReadinessGatesSection gates={readinessGates} />
          <CommandRunbooksSection runbooks={commandRunbooks} />
          <article className="panel-card phase-three-summary-panel">
            <p className="eyebrow">Phase 5 orchestration</p>
            <h2>Mission Control now has a cross-module command layer.</h2>
            <p>
              The orchestration layer adds a central timeline, recommendation tray,
              unified command/search, memory-aware summaries, assistant guidance, and
              staged multi-step workflows that can start from chat or cards.
            </p>
            <div className="health-snapshot-grid">
              <div>
                <span>Signals</span>
                <strong>{orchestrationTimeline.length}</strong>
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
              <Link className="detail-link" href="/orchestration">
                Open Orchestration Layer
              </Link>
              <Link className="detail-link" href="/approvals">
                Open Workflow Health
              </Link>
              <Link className="detail-link" href="/job-hunt">
                Open Job Hunt
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
