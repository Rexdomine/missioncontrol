import {
  approvalAnomalyFeed,
  automationRunHistory,
  connectorHealthSummaries,
  severityAlerts,
} from "@/components/mission-control-data";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";
import { WorkflowHealthModule } from "@/components/mission-control-phase-four";

export default function ApprovalsPage() {
  const unhealthyConnectors = connectorHealthSummaries.filter(
    (item) => item.status !== "Healthy",
  ).length;
  const degradedRuns = automationRunHistory.filter((run) => run.result !== "Healthy").length;

  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Phase 4 exposes approvals, alert severity, automation history, and cron/connector health in one workflow-health module so silent failures become diagnosable."
          eyebrow="Approvals & Alerts"
          metrics={[
            { label: "Alert signals", value: String(severityAlerts.length) },
            { label: "Approval anomalies", value: String(approvalAnomalyFeed.length) },
            { label: "Health watches", value: String(unhealthyConnectors + degradedRuns) },
          ]}
          title="See workflow issues before they become friction."
        />
      }
    >
      <WorkflowHealthModule />
    </MissionControlLayout>
  );
}
