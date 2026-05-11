import { approvalItems } from "@/components/mission-control-data";
import { JobOutreachMissionControl } from "@/components/job-outreach-mission-control";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";

export default function JobHuntPage() {
  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Draft-only interview pipeline that separates Greenhouse/Lever hiring signals from contact-ready leads, enriches decision-makers with Findymail or LeadMagic, verifies with Hunter/Dropcontact, tracks in Google Sheets, queues Gmail drafts, and books via Calendly."
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
