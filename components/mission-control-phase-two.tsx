"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  calendarEvents,
  calendarWeek,
  getCalendarEventHref,
  getProjectHref,
  projectBoardLanes,
  projectPortfolio,
  projectWaitingItems,
  type CalendarEvent,
  type ProjectRecord,
} from "./mission-control-data";
import { SectionHeader } from "./mission-control-sections";

function getProjectTone(status: ProjectRecord["status"]) {
  if (status === "At Risk") return "risk";
  if (status === "Waiting") return "waiting";
  if (status === "Stable") return "good";
  return "active";
}

function getPrepTone(status: CalendarEvent["prepStatus"]) {
  if (status === "Prep needed") return "warning";
  if (status === "In motion") return "active";
  return "good";
}

function getFollowUpTone(status: CalendarEvent["followUpStatus"]) {
  if (status === "Send today") return "warning";
  if (status === "Drafting" || status === "Queued") return "waiting";
  return "good";
}

export function ProjectsOperationsModule() {
  const searchParams = useSearchParams();
  const requestedProjectId = searchParams.get("project") ?? "";
  const initialProjectId = projectPortfolio.some((project) => project.id === requestedProjectId)
    ? requestedProjectId
    : projectPortfolio[0]?.id ?? "";
  const [activeProjectId, setActiveProjectId] = useState(initialProjectId);
  const activeProject =
    projectPortfolio.find((project) => project.id === activeProjectId) ?? projectPortfolio[0];
  const linkedEvents = calendarEvents.filter((event) =>
    activeProject?.linkedEventIds.includes(event.id),
  );
  const activeWaitingItems = projectWaitingItems.filter(
    (item) => item.projectId === activeProject?.id,
  );

  return (
    <section className="content-grid phase-two-grid">
      <div className="primary-column">
        <article className="panel-card board-panel">
          <SectionHeader
            detail="Stack projects by operating mode so delivery, stalls, and maintenance work stay distinct."
            eyebrow="Projects"
            title="Execution board"
          />
          <div className="project-board">
            {projectBoardLanes.map((lane) => {
              const projects = projectPortfolio.filter((project) => project.laneId === lane.id);

              return (
                <section className="board-lane" key={lane.id}>
                  <div className="board-lane-header">
                    <div>
                      <p className="eyebrow">{lane.title}</p>
                      <h3>{projects.length} active cards</h3>
                    </div>
                    <span>{lane.detail}</span>
                  </div>
                  <div className="board-lane-stack">
                    {projects.map((project) => (
                      <button
                        className={`project-card${
                          project.id === activeProject?.id ? " selected" : ""
                        }`}
                        key={project.id}
                        onClick={() => setActiveProjectId(project.id)}
                        type="button"
                      >
                        <div className="project-card-topline">
                          <div>
                            <p className="project-priority">{project.priority}</p>
                            <h3>{project.name}</h3>
                          </div>
                          <span className={`status-pill ${getProjectTone(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                        <p className="project-summary">{project.summary}</p>
                        <div className="project-card-meta">
                          <span>Owner: {project.owner}</span>
                          <span>Target: {project.targetWindow}</span>
                        </div>
                        <div className="project-focus-line">
                          <strong>Next:</strong> {project.nextAction}
                        </div>
                        <div className="project-card-counts">
                          <span>{project.blockers.length} blockers</span>
                          <span>{project.waitingOn.length} waiting on</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </article>
      </div>

      <div className="secondary-column">
        {activeProject ? (
          <article className="panel-card detail-panel">
            <SectionHeader
              detail="The selected project should expose the next useful moves without making you hunt for context."
              eyebrow="Detail"
              title={activeProject.name}
            />
            <div className="detail-metrics">
              <div className="detail-metric">
                <span>Status</span>
                <strong>{activeProject.status}</strong>
              </div>
              <div className="detail-metric">
                <span>Owner</span>
                <strong>{activeProject.owner}</strong>
              </div>
              <div className="detail-metric">
                <span>Target</span>
                <strong>{activeProject.targetWindow}</strong>
              </div>
            </div>

            <div className="detail-stack">
              <section className="detail-card">
                <p className="eyebrow">Current Focus</p>
                <p className="detail-copy">{activeProject.currentFocus}</p>
              </section>

              <section className="detail-card">
                <p className="eyebrow">Next Actions</p>
                <ul className="detail-list">
                  {activeProject.nextActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </section>

              <section className="detail-card split">
                <div>
                  <p className="eyebrow">Blockers</p>
                  <ul className="detail-list">
                    {activeProject.blockers.length ? (
                      activeProject.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)
                    ) : (
                      <li>No blockers right now.</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="eyebrow">Waiting On</p>
                  <ul className="detail-list">
                    {activeProject.waitingOn.length ? (
                      activeProject.waitingOn.map((item) => <li key={item}>{item}</li>)
                    ) : (
                      <li>No external waits right now.</li>
                    )}
                  </ul>
                </div>
              </section>

              <section className="detail-card">
                <p className="eyebrow">Connected Schedule</p>
                <div className="linked-event-list">
                  {linkedEvents.map((event) => (
                    <div className="linked-event-card" key={event.id}>
                      <div className="linked-event-topline">
                        <strong>{event.title}</strong>
                        <span>
                          {event.start} - {event.end}
                        </span>
                      </div>
                      <p>{event.summary}</p>
                      <Link className="detail-link" href={getCalendarEventHref(event.id)}>
                        Open in calendar
                      </Link>
                    </div>
                  ))}
                </div>
              </section>

              <section className="detail-card">
                <p className="eyebrow">Recent Moves</p>
                <ul className="detail-list">
                  {activeProject.recentMoves.map((move) => (
                    <li key={move}>{move}</li>
                  ))}
                </ul>
              </section>
            </div>
          </article>
        ) : null}

        <article className="panel-card rail-panel">
          <SectionHeader
            detail="A dedicated rail keeps external dependencies visible before they quietly slow the week down."
            eyebrow="Waiting On"
            title="External dependencies"
          />
          <div className="waiting-rail">
            {(activeWaitingItems.length ? activeWaitingItems : projectWaitingItems).map((item) => (
              <div className="waiting-card" key={item.id}>
                <div className="waiting-card-topline">
                  <h3>{item.title}</h3>
                  <span>{item.eta}</span>
                </div>
                <p>{item.impact}</p>
                <div className="waiting-owner">Owner: {item.owner}</div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export function CalendarOperationsModule() {
  const searchParams = useSearchParams();
  const requestedDayId = searchParams.get("day") ?? "";
  const requestedEventId = searchParams.get("event") ?? "";
  const initialDayId = calendarWeek.some((day) => day.id === requestedDayId)
    ? requestedDayId
    : calendarWeek[0]?.id ?? "";
  const fallbackEventId = calendarEvents.find((event) => event.dayId === initialDayId)?.id ?? "";
  const initialEventId = calendarEvents.some(
    (event) => event.id === requestedEventId && event.dayId === initialDayId,
  )
    ? requestedEventId
    : fallbackEventId;
  const [activeDayId, setActiveDayId] = useState(initialDayId);
  const [activeEventId, setActiveEventId] = useState(initialEventId);

  const activeDay = calendarWeek.find((day) => day.id === activeDayId) ?? calendarWeek[0];
  const activeDayEvents = calendarEvents.filter((event) => event.dayId === activeDay?.id);
  const activeEvent =
    activeDayEvents.find((event) => event.id === activeEventId) ?? activeDayEvents[0];
  const followUpQueue = calendarEvents.filter((event) => event.followUpStatus !== "Done");
  const prepQueue = calendarEvents.filter((event) => event.prepStatus === "Prep needed");
  const linkedProject = projectPortfolio.find(
    (project) => project.id === activeEvent?.projectId,
  );

  function handleSelectDay(dayId: string) {
    setActiveDayId(dayId);

    const firstEventForDay = calendarEvents.find((event) => event.dayId === dayId);
    setActiveEventId(firstEventForDay?.id ?? "");
  }

  return (
    <section className="content-grid phase-two-grid">
      <div className="primary-column">
        <article className="panel-card planner-panel">
          <SectionHeader
            detail="Use the week strip to keep commitments visible, then drop into the selected day with prep and follow-through attached."
            eyebrow="Calendar"
            title="Week planner"
          />
          <div className="week-strip">
            {calendarWeek.map((day) => {
              const eventCount = calendarEvents.filter((event) => event.dayId === day.id).length;

              return (
                <button
                  className={`day-chip${day.id === activeDay?.id ? " selected" : ""}`}
                  key={day.id}
                  onClick={() => handleSelectDay(day.id)}
                  type="button"
                >
                  <span>{day.label}</span>
                  <strong>{day.dateLabel}</strong>
                  <em>{eventCount} items</em>
                </button>
              );
            })}
          </div>

          {activeDay ? (
            <div className="planner-summary">
              <div>
                <p className="eyebrow">Day Focus</p>
                <h3>
                  {activeDay.dateLabel} is built around {activeDay.focus.toLowerCase()}
                </h3>
              </div>
              <span className="load-pill">{activeDay.load} load</span>
            </div>
          ) : null}

          <div className="timeline-list">
            {activeDayEvents.map((event) => (
              <button
                className={`timeline-card${event.id === activeEvent?.id ? " selected" : ""}`}
                key={event.id}
                onClick={() => setActiveEventId(event.id)}
                type="button"
              >
                <div className="timeline-slot">
                  <time>
                    {event.start}
                    <span>{event.end}</span>
                  </time>
                </div>
                <div className="timeline-content">
                  <div className="timeline-topline">
                    <h3>{event.title}</h3>
                    <div className="timeline-tags">
                      <span className={`status-pill ${getPrepTone(event.prepStatus)}`}>
                        {event.prepStatus}
                      </span>
                      <span className={`status-pill ${getFollowUpTone(event.followUpStatus)}`}>
                        {event.followUpStatus}
                      </span>
                    </div>
                  </div>
                  <p>{event.summary}</p>
                  <div className="timeline-meta">
                    <span>{event.location}</span>
                    <span>{event.organizer}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </article>
      </div>

      <div className="secondary-column">
        {activeEvent ? (
          <article className="panel-card detail-panel">
            <SectionHeader
              detail="Every event should answer three questions quickly: what to prep, what it affects, and what happens after."
              eyebrow={activeEvent.type}
              title={activeEvent.title}
            />
            <div className="event-headline">
              <div>
                <strong>
                  {activeEvent.start} - {activeEvent.end}
                </strong>
                <span>{activeEvent.location}</span>
              </div>
              <div className="event-status-stack">
                <span className={`status-pill ${getPrepTone(activeEvent.prepStatus)}`}>
                  {activeEvent.prepStatus}
                </span>
                <span className={`status-pill ${getFollowUpTone(activeEvent.followUpStatus)}`}>
                  {activeEvent.followUpStatus}
                </span>
              </div>
            </div>

            <div className="detail-stack">
              <section className="detail-card">
                <p className="eyebrow">Prep Needed</p>
                <ul className="detail-list">
                  {activeEvent.prepItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="detail-card">
                <p className="eyebrow">Follow Up</p>
                <ul className="detail-list">
                  {activeEvent.followUps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="detail-card">
                <p className="eyebrow">Execution Context</p>
                <ul className="detail-list">
                  {activeEvent.executionContext.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              {linkedProject ? (
                <section className="detail-card project-connection-card">
                  <p className="eyebrow">Connected Project</p>
                  <div className="project-connection-topline">
                    <h3>{linkedProject.name}</h3>
                    <span className={`status-pill ${getProjectTone(linkedProject.status)}`}>
                      {linkedProject.status}
                    </span>
                  </div>
                  <p className="detail-copy">{linkedProject.nextAction}</p>
                  <Link className="detail-link" href={getProjectHref(linkedProject.id)}>
                    Open in projects
                  </Link>
                </section>
              ) : null}
            </div>
          </article>
        ) : null}

        <article className="panel-card rail-panel">
          <SectionHeader
            detail="Prep pressure and follow-up work should stay visible even when a different event is selected."
            eyebrow="Execution Queue"
            title="Prep and follow-through"
          />

          <div className="queue-section">
            <p className="queue-label">Prep Needed</p>
            <div className="queue-list">
              {prepQueue.map((event) => (
                <div className="queue-card" key={event.id}>
                  <div className="queue-topline">
                    <h3>{event.title}</h3>
                    <span>{event.start}</span>
                  </div>
                  <p>{event.prepItems[0]}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="queue-section">
            <p className="queue-label">Open Follow Ups</p>
            <div className="queue-list">
              {followUpQueue.map((event) => (
                <div className="queue-card" key={event.id}>
                  <div className="queue-topline">
                    <h3>{event.title}</h3>
                    <span>{event.followUpStatus}</span>
                  </div>
                  <p>{event.followUps[0]}</p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
