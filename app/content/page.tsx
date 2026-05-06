import { contentCalendar, contentIdeas, productionStages } from "@/components/mission-control-data";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";
import { ContentPipelineModule } from "@/components/mission-control-phase-three";

export default function ContentPage() {
  const activeAssets = contentIdeas.filter((idea) => idea.stage !== "Publish").length;
  const scheduledItems = contentCalendar.filter((item) => item.state === "Scheduled").length;

  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Phase 3 gives Prompt to Code, founder ops, AI-native engineering, and personal creative work a real production board with hooks, shoot states, and a publishing calendar."
          eyebrow="Content"
          metrics={[
            { label: "Ideas tracked", value: String(contentIdeas.length) },
            { label: "Production stages", value: String(productionStages.length) },
            { label: "Scheduled", value: `${scheduledItems}/${contentCalendar.length}` },
          ]}
          title={`${activeAssets} content assets are moving through production.`}
        />
      }
    >
      <ContentPipelineModule />
    </MissionControlLayout>
  );
}
