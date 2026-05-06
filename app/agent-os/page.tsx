import {
  activityTimeline,
  agentStatuses,
  commandRunbooks,
  connectorHealthSummaries,
  continuityRecords,
  dispatchQueue,
  handoffPackets,
  operatingTasks,
  publicationPipeline,
  readinessGates,
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
          copy="Agent OS Phase 7 keeps trust intact while adding handoff packets, pause/resume markers, and operating cadences so project switches stay controlled."
          eyebrow="Agent OS"
          metrics={[
            { label: "Active agents", value: String(activeAgents) },
            { label: "Trust signals", value: String(trustSignals.length) },
            { label: "Handoff packets", value: String(handoffPackets.length) },
          ]}
          title="Agent OS now carries safe handoffs across active and paused work."
        />
      }
    >
      <section className="content-grid agent-os-grid">
        <div className="primary-column">
          <AgentOperationsSection agents={agentStatuses} />
          <ReadinessGatesSection gates={readinessGates} />
          <CommandRunbooksSection runbooks={commandRunbooks} />
          <article className="panel-card phase-three-summary-panel">
            <p className="eyebrow">Phase 7 handoff layer</p>
            <h2>Mission Control now preserves pause, resume, and review state.</h2>
            <p>
              The handoff layer packages review-ready work, paused project lanes,
              and recurring operating cadence into visible packets on top of the
              Phase 6 trust layer.
            </p>
            <div className="health-snapshot-grid">
              <div>
                <span>Trust signals</span>
                <strong>{trustSignals.length}</strong>
              </div>
              <div>
                <span>Handoffs</span>
                <strong>{handoffPackets.length}</strong>
              </div>
              <div>
                <span>Health watches</span>
                <strong>{unhealthyWorkflows}</strong>
              </div>
            </div>
            <div className="phase-three-link-row">
              <Link className="detail-link" href="/handoff">
                Open Handoff Layer
              </Link>
              <Link className="detail-link" href="/trust">
                Open Trust Layer
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
