import { EmptyModuleState, MissionControlLayout, PageHero } from "@/components/mission-control-layout";

export default function JobHuntPage() {
  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="The route exists now so the information architecture is stable. The real pipeline UI lands after the operational core is verified."
          eyebrow="Job Hunt"
          metrics={[
            { label: "Module state", value: "Queued" },
            { label: "Next phase", value: "Phase 3" },
            { label: "Source", value: "Automation ready" },
          ]}
          title="Job Hunt becomes a first-class workflow in Phase 3."
        />
      }
    >
      <EmptyModuleState
        action="Next: shortlist table, application stages, and role detail panels."
        body="The automated job hunt already exists in the workspace. This module will become the visual command layer on top of that system."
        title="Job Hunt UI is planned and routed."
      />
    </MissionControlLayout>
  );
}
