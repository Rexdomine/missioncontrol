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
          copy="Mission Control now covers the daily cockpit plus execution planning: active projects, calendar context, approvals visibility, and the command surface for direct work with StarLord."
          eyebrow="Phase 2"
          metrics={[
            { label: "Focus Items", value: String(focusItems.length) },
            { label: "Agenda Items", value: String(agendaItems.length) },
            {
              label: "Approvals / Alerts",
              value: String(approvalItems.length + alerts.length),
            },
          ]}
          title="Daily control plus connected project and calendar operations."
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
