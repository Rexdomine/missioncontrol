import { applicationStages, jobHuntOutputs, jobRoles } from "@/components/mission-control-data";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";
import { JobHuntPipelineModule } from "@/components/mission-control-phase-three";

export default function JobHuntPage() {
  const tailoringCount = jobRoles.filter((role) => role.stage === "Tailoring").length;
  const readyOutputs = jobHuntOutputs.filter((output) => output.state === "Ready").length;

  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Phase 3 turns the remote-role hunt from recurring intent into an actionable pipeline: scored roles, application stages, tailored angles, and daily/weekly outputs now live in one module."
          eyebrow="Job Hunt"
          metrics={[
            { label: "Tracked roles", value: String(jobRoles.length) },
            { label: "Pipeline stages", value: String(applicationStages.length) },
            { label: "Ready outputs", value: `${readyOutputs}/${jobHuntOutputs.length}` },
          ]}
          title={`${tailoringCount} high-fit role needs tailoring now.`}
        />
      }
    >
      <JobHuntPipelineModule />
    </MissionControlLayout>
  );
}
