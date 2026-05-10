import { approvalItems } from "@/components/mission-control-data";
import { JobOutreachMissionControl } from "@/components/job-outreach-mission-control";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";

export default function JobHuntPage() {
  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Draft-only outbound job-search engine for Apollo-sourced hiring leads, AI scoring, personalized email approvals, Google Sheets tracking, reply handling, follow-ups, and Calendly interview conversion."
          eyebrow="Job Outreach Mission Control"
          metrics={[
            { label: "Mode", value: "Draft Only" },
            { label: "Approval gates", value: String(approvalItems.length + 1) },
            { label: "System of record", value: "Sheets" },
          ]}
          title="Interview Pipeline Mission Control is live in draft-only mode."
        />
      }
    >
      <JobOutreachMissionControl />
    </MissionControlLayout>
  );
}
