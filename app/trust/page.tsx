import {
  actionLogEntries,
  productStateCards,
  responsiveChecks,
  trustSignals,
} from "@/components/mission-control-data";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";
import { TrustPolishModule } from "@/components/mission-control-phase-six";

export default function TrustPage() {
  const verifiedSignals = trustSignals.filter((signal) => signal.status === "Verified").length;

  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Phase 6 adds the polish and trust layer: provenance, confidence, audit logs, responsive readiness, and explicit empty/loading/failure states for daily use."
          eyebrow="Polish, mobile, and trust"
          metrics={[
            { label: "Verified signals", value: String(verifiedSignals) },
            { label: "Action logs", value: String(actionLogEntries.length) },
            { label: "State patterns", value: String(productStateCards.length) },
            { label: "Viewports", value: String(responsiveChecks.length) },
          ]}
          title="Mission Control now explains itself and feels dependable."
        />
      }
    >
      <TrustPolishModule />
    </MissionControlLayout>
  );
}
