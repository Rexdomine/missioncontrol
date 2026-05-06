import {
  activityTimeline,
  agentStatuses,
  commandRunbooks,
  continuityRecords,
  dispatchQueue,
  operatingTasks,
  publicationPipeline,
  readinessGates,
  skillRegistry,
} from "@/components/mission-control-data";
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
  const readyGates = readinessGates.filter((gate) => gate.status === "Ready").length;
  const readySkills = skillRegistry.filter((skill) => skill.status === "Ready").length;

  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Agent OS Phase 2 moves the page from passive visibility into controlled execution: runbooks, readiness gates, dispatch state, and the PR pipeline are now visible before work is launched."
          eyebrow="Agent OS"
          metrics={[
            { label: "Active agents", value: String(activeAgents) },
            { label: "Ready gates", value: `${readyGates}/${readinessGates.length}` },
            { label: "Runbooks", value: String(commandRunbooks.length) },
          ]}
          title="Control how agent work starts, pauses, and reaches review."
        />
      }
    >
      <section className="content-grid agent-os-grid">
        <div className="primary-column">
          <AgentOperationsSection agents={agentStatuses} />
          <ReadinessGatesSection gates={readinessGates} />
          <CommandRunbooksSection runbooks={commandRunbooks} />
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
