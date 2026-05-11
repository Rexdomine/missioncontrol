import { approvalItems } from "@/components/mission-control-data";
import { JobOutreachMissionControl } from "@/components/job-outreach-mission-control";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";

export default function JobHuntPage() {
  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Draft-only interview pipeline using Greenhouse and Lever public job APIs for active hiring signals, Findymail or LeadMagic for decision-makers, Hunter/Dropcontact verification fallback, Google Sheets tracking, Gmail drafts, and Calendly booking."
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
