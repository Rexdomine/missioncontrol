import {
  agendaItems,
  alerts,
  approvalItems,
  chatThreads,
  focusItems,
  projectPulse,
  quickActions,
} from "./mission-control-data";
import { MissionControlLayout, PageHero } from "./mission-control-layout";
import {
  AgendaSection,
  ApprovalsSection,
  CommandSection,
  FocusSection,
  ProjectPulseSection,
  ThreadsSection,
} from "./mission-control-sections";

export function MissionControlShell() {
  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="The first working version is optimized for high-signal daily control: what matters now, what is blocked, and what StarLord should do next."
          eyebrow="Phase 1"
          metrics={[
            { label: "Focus Items", value: String(focusItems.length) },
            { label: "Agenda Items", value: String(agendaItems.length) },
            {
              label: "Approvals / Alerts",
              value: String(approvalItems.length + alerts.length),
            },
          ]}
          title="Daily cockpit, approvals visibility, and the base command surface."
        />
      }
    >
      <section className="content-grid">
        <div className="primary-column">
          <FocusSection items={focusItems} />
          <AgendaSection items={agendaItems} />
          <ProjectPulseSection projects={projectPulse} />
        </div>
        <div className="secondary-column">
          <CommandSection actions={quickActions} />
          <ApprovalsSection alerts={alerts} approvals={approvalItems} />
          <ThreadsSection threads={chatThreads} />
        </div>
      </section>
    </MissionControlLayout>
  );
}
