import {
  sdfAgentLanes,
  sdfFactoryModes,
  sdfPhaseTasks,
  sdfPipelineStages,
  sdfQualityGates,
  sdfRexInputQueue,
} from "@/components/mission-control-data";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";
import { SoftwareDevelopmentFactoryModule } from "@/components/software-development-factory";

export default function SdfPage() {
  const activePipeline = sdfPipelineStages.filter((stage) => stage.status === "Active").length;
  const requiredGates = sdfQualityGates.filter((gate) => gate.status === "Required").length;

  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="The Software Development Factory is Mission Control's engineering production line: intake the idea, break it into phases, assign helper-agent lanes, enforce quality gates, and hand Rex a clean PR checkpoint."
          eyebrow="Software Development Factory"
          metrics={[
            { label: "Factory modes", value: String(sdfFactoryModes.length) },
            { label: "Helper lanes", value: String(sdfAgentLanes.length) },
            { label: "Quality gates", value: String(sdfQualityGates.length) },
            { label: "Active stages", value: String(activePipeline) },
          ]}
          title="Turn software ideas into review-ready build pipelines."
        />
      }
    >
      <SoftwareDevelopmentFactoryModule
        agents={sdfAgentLanes}
        gates={sdfQualityGates}
        modes={sdfFactoryModes}
        pipeline={sdfPipelineStages}
        rexInputs={sdfRexInputQueue}
        tasks={sdfPhaseTasks}
      />
      <div className="sr-only">{requiredGates} SDF gates require verification before PR handoff.</div>
    </MissionControlLayout>
  );
}
