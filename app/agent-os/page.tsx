import {
  activityTimeline,
  agentStatuses,
  continuityRecords,
  operatingTasks,
  skillRegistry,
} from "@/components/mission-control-data";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";
import {
  ActivityTimelineSection,
  AgentOperationsSection,
  ContinuitySection,
  OperatingTasksSection,
  SkillsRegistrySection,
} from "@/components/mission-control-sections";

export default function AgentOSPage() {
  const activeAgents = agentStatuses.filter((agent) => agent.state === "Executing").length;
  const pausedTasks = operatingTasks.filter((task) => task.lane === "Paused").length;
  const readySkills = skillRegistry.filter((skill) => skill.status === "Ready").length;

  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Mission Control now has the first Agent OS surface: agent status, task lanes, activity history, skill readiness, and memory-backed continuity in one operational view."
          eyebrow="Agent OS"
          metrics={[
            { label: "Active agents", value: String(activeAgents) },
            { label: "Paused blockers", value: String(pausedTasks) },
            { label: "Ready skills", value: String(readySkills) },
          ]}
          title="See what the agent system is doing and where work resumes."
        />
      }
    >
      <section className="content-grid agent-os-grid">
        <div className="primary-column">
          <AgentOperationsSection agents={agentStatuses} />
          <OperatingTasksSection tasks={operatingTasks} />
          <ActivityTimelineSection events={activityTimeline} />
        </div>
        <div className="secondary-column">
          <ContinuitySection records={continuityRecords} />
          <SkillsRegistrySection skills={skillRegistry} />
        </div>
      </section>
    </MissionControlLayout>
  );
}
