import { EmptyModuleState, MissionControlLayout, PageHero } from "@/components/mission-control-layout";

export default function CalendarPage() {
  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Phase 1 focuses on the Today surface. Calendar becomes a dedicated module in Phase 2 with agenda and prep states."
          eyebrow="Calendar"
          metrics={[
            { label: "Module state", value: "Queued" },
            { label: "Next phase", value: "Phase 2" },
            { label: "Primary view", value: "Agenda" },
          ]}
          title="Calendar visibility follows after the daily cockpit."
        />
      }
    >
      <EmptyModuleState
        action="Next: build day/week agenda, event detail drawer, and prep-needed states."
        body="Calendar routing is present now so the app behaves like a real product instead of a single-screen mockup."
        title="Calendar module is staged, not missing."
      />
    </MissionControlLayout>
  );
}
