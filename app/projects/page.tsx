import { EmptyModuleState, MissionControlLayout, PageHero } from "@/components/mission-control-layout";

export default function ProjectsPage() {
  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="The project module is intentionally routed now so Phase 1 has a complete information architecture and clear extension path."
          eyebrow="Projects"
          metrics={[
            { label: "Module state", value: "Queued" },
            { label: "Next phase", value: "Phase 2" },
            { label: "Design status", value: "Planned" },
          ]}
          title="Project execution lands in Phase 2."
        />
      }
    >
      <EmptyModuleState
        action="Next: wire board view, project details, and next-action rails."
        body="Projects will become the execution home for active work, blockers, and ownership once the Today cockpit is fully verified."
        title="Project board is intentionally staged for the next phase."
      />
    </MissionControlLayout>
  );
}
