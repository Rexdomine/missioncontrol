import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";
import { ApprovalsSection } from "@/components/mission-control-sections";
import { alerts, approvalItems } from "@/components/mission-control-data";

export default function ApprovalsPage() {
  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Phase 1 surfaces action-worthy approvals and alerts in a clean queue so operations stay readable."
          eyebrow="Approvals"
          metrics={[
            { label: "Pending approvals", value: String(approvalItems.length) },
            { label: "Live alerts", value: String(alerts.length) },
            { label: "Escalation state", value: "Monitored" },
          ]}
          title="Keep approval noise and operational risk visible."
        />
      }
    >
      <section className="content-grid single-column">
        <div className="primary-column">
          <ApprovalsSection alerts={alerts} approvals={approvalItems} />
        </div>
      </section>
    </MissionControlLayout>
  );
}
