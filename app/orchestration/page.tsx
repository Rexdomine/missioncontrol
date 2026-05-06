import {
  memoryAwareSummaries,
  multiStepWorkflows,
  orchestrationTimeline,
  recommendationItems,
} from "@/components/mission-control-data";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";
import { OrchestrationLayerModule } from "@/components/mission-control-phase-five";

export default function OrchestrationPage() {
  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Phase 5 turns Mission Control into an intelligent operating layer: central timeline, recommendations, unified command/search, memory summaries, and guided workflows."
          eyebrow="Intelligent orchestration"
          metrics={[
            { label: "Timeline signals", value: String(orchestrationTimeline.length) },
            { label: "Recommendations", value: String(recommendationItems.length) },
            { label: "Guided workflows", value: String(multiStepWorkflows.length) },
            { label: "Memory summaries", value: String(memoryAwareSummaries.length) },
          ]}
          title="Command the whole system from one orchestration layer."
        />
      }
    >
      <OrchestrationLayerModule />
    </MissionControlLayout>
  );
}
