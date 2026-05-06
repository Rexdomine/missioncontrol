import { HandoffModule } from "@/components/mission-control-phase-seven";
import { handoffPackets, operatingCadenceItems, pauseResumeMarkers } from "@/components/mission-control-data";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";

export default function HandoffPage() {
  const pausedLanes = pauseResumeMarkers.filter((marker) => marker.status === "Paused").length;
  const readyPackets = handoffPackets.filter((packet) => packet.state === "Ready").length;

  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Phase 7 adds the handoff layer: review packets, pause/resume markers, and operating cadences so Rex can switch projects without losing the exact state of work."
          eyebrow="Phase 7"
          metrics={[
            { label: "Ready packets", value: String(readyPackets) },
            { label: "Paused lanes", value: String(pausedLanes) },
            { label: "Cadences", value: String(operatingCadenceItems.length) },
          ]}
          title="Agent OS now remembers how to pause, resume, and hand off work."
        />
      }
    >
      <HandoffModule />
    </MissionControlLayout>
  );
}
