import { EmptyModuleState, MissionControlLayout, PageHero } from "@/components/mission-control-layout";

export default function ContentPage() {
  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="The content route is part of Phase 1 routing completeness, while the real backlog and production board are part of Phase 3."
          eyebrow="Content"
          metrics={[
            { label: "Module state", value: "Queued" },
            { label: "Next phase", value: "Phase 3" },
            { label: "Planned view", value: "Backlog + Calendar" },
          ]}
          title="Content ops come after the operating core."
        />
      }
    >
      <EmptyModuleState
        action="Next: content backlog, production statuses, and publishing calendar."
        body="This module will manage shoot planning, ideas, drafts, and publishing once the core dashboard is runtime-verified."
        title="Content workflow is staged with a stable route."
      />
    </MissionControlLayout>
  );
}
