import {
  activityTimeline,
  agentStatuses,
  commandRunbooks,
  continuityRecords,
  dispatchQueue,
  contentIdeas,
  jobRoles,
  operatingTasks,
  publicationPipeline,
  readinessGates,
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
  const activeContentAssets = contentIdeas.filter((idea) => idea.stage !== "Publish").length;

  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Agent OS Phase 3 keeps execution controls visible while adding the two recurring personal-growth systems: remote role hunting and content production."
          eyebrow="Agent OS"
          metrics={[
            { label: "Active agents", value: String(activeAgents) },
            { label: "Tracked roles", value: String(jobRoles.length) },
            { label: "Content assets", value: String(activeContentAssets) },
          ]}
          title="Agent OS now connects execution, job hunt, and content pipelines."
        />
      }
    >
      <section className="content-grid agent-os-grid">
        <div className="primary-column">
          <AgentOperationsSection agents={agentStatuses} />
          <ReadinessGatesSection gates={readinessGates} />
          <CommandRunbooksSection runbooks={commandRunbooks} />
          <article className="panel-card phase-three-summary-panel">
            <p className="eyebrow">Phase 3 workflows</p>
            <h2>Personal growth pipelines are now visible and actionable.</h2>
            <p>
              Job Hunt and Content moved from queued routes into live operating modules with
              scored roles, application stages, tailored angles, idea backlog, shoot state, and
              publishing calendar.
            </p>
            <div className="phase-three-link-row">
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
