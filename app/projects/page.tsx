import { Suspense } from "react";
import {
  projectBoardLanes,
  projectPortfolio,
  projectWaitingItems,
} from "@/components/mission-control-data";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";
import { ProjectsOperationsModule } from "@/components/mission-control-phase-two";

export default function ProjectsPage() {
  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Projects now operate as a real execution surface: the board keeps active work visible, the detail rail keeps next actions explicit, and external dependencies stay impossible to ignore."
          eyebrow="Projects"
          metrics={[
            { label: "Live projects", value: String(projectPortfolio.length) },
            { label: "Board lanes", value: String(projectBoardLanes.length) },
            { label: "Waiting on", value: String(projectWaitingItems.length) },
          ]}
          title="Active work, blockers, and next moves in one board."
        />
      }
    >
      <Suspense fallback={null}>
        <ProjectsOperationsModule />
      </Suspense>
    </MissionControlLayout>
  );
}
