import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";
import { CommandSection, ThreadsSection } from "@/components/mission-control-sections";
import { chatThreads, quickActions } from "@/components/mission-control-data";

export default function ChatPage() {
  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Phase 1 keeps chat intentionally simple: thread visibility, staged commands, and structured quick actions."
          eyebrow="Chat"
          metrics={[
            { label: "Threads", value: String(chatThreads.length) },
            { label: "Quick actions", value: String(quickActions.length) },
            { label: "Execution mode", value: "Staged" },
          ]}
          title="Work with StarLord from a focused command surface."
        />
      }
    >
      <section className="content-grid">
        <div className="secondary-column">
          <CommandSection actions={quickActions} />
        </div>
        <div className="primary-column">
          <ThreadsSection threads={chatThreads} />
        </div>
      </section>
    </MissionControlLayout>
  );
}
