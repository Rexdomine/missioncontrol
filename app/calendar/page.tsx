import { Suspense } from "react";
import { calendarEvents, calendarWeek } from "@/components/mission-control-data";
import { MissionControlLayout, PageHero } from "@/components/mission-control-layout";
import { CalendarOperationsModule } from "@/components/mission-control-phase-two";

export default function CalendarPage() {
  const prepNeededCount = calendarEvents.filter(
    (event) => event.prepStatus === "Prep needed",
  ).length;
  const openFollowUps = calendarEvents.filter(
    (event) => event.followUpStatus !== "Done",
  ).length;

  return (
    <MissionControlLayout
      hero={
        <PageHero
          copy="Calendar now ties commitments to execution: the week view makes load visible, the day timeline keeps prep attached, and follow-up work stays connected to the projects it moves."
          eyebrow="Calendar"
          metrics={[
            { label: "Week view", value: String(calendarWeek.length) + " days" },
            { label: "Prep needed", value: String(prepNeededCount) },
            { label: "Open follow-ups", value: String(openFollowUps) },
          ]}
          title="Day planning that stays attached to real project work."
        />
      }
    >
      <Suspense fallback={null}>
        <CalendarOperationsModule />
      </Suspense>
    </MissionControlLayout>
  );
}
