"use client";

import { useState } from "react";
import {
  applicationStages,
  contentCalendar,
  contentIdeas,
  jobHuntOutputs,
  jobRoles,
  productionStages,
  type ContentIdea,
  type JobRole,
} from "./mission-control-data";
import { SectionHeader } from "./mission-control-sections";

function jobStageTone(stage: JobRole["stage"]) {
  if (stage === "Tailoring") return "active";
  if (stage === "Applied") return "good";
  if (stage === "Follow-up") return "warning";
  return "waiting";
}

function outputTone(state: "Ready" | "Due" | "Watch") {
  if (state === "Due") return "warning";
  if (state === "Watch") return "waiting";
  return "good";
}

function contentTone(stage: ContentIdea["stage"]) {
  if (stage === "Publish") return "good";
  if (stage === "Shoot" || stage === "Script") return "active";
  if (stage === "Edit") return "warning";
  return "waiting";
}

export function JobHuntPipelineModule() {
  const [activeRoleId, setActiveRoleId] = useState(jobRoles[0]?.id ?? "");
  const activeRole = jobRoles.find((role) => role.id === activeRoleId) ?? jobRoles[0];
  const topRoles = [...jobRoles].sort((a, b) => b.fitScore - a.fitScore).slice(0, 3);

  return (
    <section className="content-grid phase-three-grid">
      <div className="primary-column">
        <article className="panel-card pipeline-dashboard-panel">
          <SectionHeader
            detail="Daily search output, weekly review, and active applications now share one operating surface."
            eyebrow="Job Hunt"
            title="Outputs that become applications"
          />
          <div className="output-grid">
            {jobHuntOutputs.map((output) => (
              <div className="output-card" key={output.id}>
                <div className="control-card-head">
                  <div>
                    <p className="project-priority">{output.cadence}</p>
                    <h3>{output.label}</h3>
                  </div>
                  <span className={`status-pill ${outputTone(output.state)}`}>{output.state}</span>
                </div>
                <p>{output.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card board-panel">
          <SectionHeader
            detail="Move roles from raw shortlist into tailored sends and follow-up without losing the reason each one matters."
            eyebrow="Applications"
            title="Application pipeline"
          />
          <div className="project-board phase-three-board">
            {applicationStages.map((stage) => {
              const roles = stage.roleIds
                .map((roleId) => jobRoles.find((role) => role.id === roleId))
                .filter((role): role is JobRole => Boolean(role));

              return (
                <section className="board-lane" key={stage.id}>
                  <div className="board-lane-header">
                    <div>
                      <p className="eyebrow">{stage.title}</p>
                      <h3>{roles.length} roles</h3>
                    </div>
                    <span>{stage.detail}</span>
                  </div>
                  <div className="board-lane-stack">
                    {roles.map((role) => (
                      <button
                        className={`project-card${role.id === activeRole?.id ? " selected" : ""}`}
                        key={role.id}
                        onClick={() => setActiveRoleId(role.id)}
                        type="button"
                      >
                        <div className="project-card-topline">
                          <div>
                            <p className="project-priority">{role.priority}</p>
                            <h3>{role.role}</h3>
                          </div>
                          <span className={`status-pill ${jobStageTone(role.stage)}`}>
                            {role.stage}
                          </span>
                        </div>
                        <p className="project-summary">{role.company}</p>
                        <div className="project-card-meta">
                          <span>{role.fitScore}% fit</span>
                          <span>{role.deadline}</span>
                        </div>
                        <div className="project-focus-line">
                          <strong>Next:</strong> {role.nextAction}
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
        {activeRole ? (
          <article className="panel-card detail-panel">
            <SectionHeader
              detail="The selected role should already answer why it matters and what angle to send."
              eyebrow="Role detail"
              title={activeRole.company}
            />
            <div className="detail-metrics">
              <div className="detail-metric">
                <span>Fit</span>
                <strong>{activeRole.fitScore}%</strong>
              </div>
              <div className="detail-metric">
                <span>Stage</span>
                <strong>{activeRole.stage}</strong>
              </div>
              <div className="detail-metric">
                <span>Deadline</span>
                <strong>{activeRole.deadline}</strong>
              </div>
            </div>
            <div className="detail-stack">
              <section className="detail-card">
                <p className="eyebrow">Why it fits</p>
                <p className="detail-copy">{activeRole.whyItFits}</p>
              </section>
              <section className="detail-card">
                <p className="eyebrow">Tailored angles</p>
                <ul className="detail-list">
                  {activeRole.tailoredAngles.map((angle) => (
                    <li key={angle}>{angle}</li>
                  ))}
                </ul>
              </section>
              <section className="detail-card">
                <p className="eyebrow">Next action</p>
                <p className="detail-copy">{activeRole.nextAction}</p>
              </section>
            </div>
          </article>
        ) : null}

        <article className="panel-card rail-panel">
          <SectionHeader
            detail="The strongest opportunities should stay visible even before the full review session starts."
            eyebrow="Shortlist"
            title="Top roles this week"
          />
          <div className="waiting-rail">
            {topRoles.map((role) => (
              <button
                className={`waiting-card selectable-card${role.id === activeRole?.id ? " selected" : ""}`}
                key={role.id}
                onClick={() => setActiveRoleId(role.id)}
                type="button"
              >
                <div className="waiting-card-topline">
                  <h3>{role.company}</h3>
                  <span>{role.fitScore}%</span>
                </div>
                <p>{role.role}</p>
                <div className="waiting-owner">{role.location}</div>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export function ContentPipelineModule() {
  const [activeIdeaId, setActiveIdeaId] = useState(contentIdeas[0]?.id ?? "");
  const activeIdea = contentIdeas.find((idea) => idea.id === activeIdeaId) ?? contentIdeas[0];

  return (
    <section className="content-grid phase-three-grid">
      <div className="primary-column">
        <article className="panel-card board-panel">
          <SectionHeader
            detail="Ideas now have production state, not just intention. Move each asset from hook to publishable output."
            eyebrow="Content"
            title="Production board"
          />
          <div className="project-board phase-three-board">
            {productionStages.map((stage) => {
              const ideas = stage.ideaIds
                .map((ideaId) => contentIdeas.find((idea) => idea.id === ideaId))
                .filter((idea): idea is ContentIdea => Boolean(idea));

              return (
                <section className="board-lane" key={stage.id}>
                  <div className="board-lane-header">
                    <div>
                      <p className="eyebrow">{stage.title}</p>
                      <h3>{ideas.length} assets</h3>
                    </div>
                    <span>{stage.detail}</span>
                  </div>
                  <div className="board-lane-stack">
                    {ideas.map((idea) => (
                      <button
                        className={`project-card${idea.id === activeIdea?.id ? " selected" : ""}`}
                        key={idea.id}
                        onClick={() => setActiveIdeaId(idea.id)}
                        type="button"
                      >
                        <div className="project-card-topline">
                          <div>
                            <p className="project-priority">{idea.pillar}</p>
                            <h3>{idea.title}</h3>
                          </div>
                          <span className={`status-pill ${contentTone(idea.stage)}`}>
                            {idea.stage}
                          </span>
                        </div>
                        <p className="project-summary">{idea.hook}</p>
                        <div className="project-card-meta">
                          <span>{idea.format}</span>
                          <span>{idea.stage}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </article>

        <article className="panel-card planner-panel">
          <SectionHeader
            detail="Publishing dates stay attached to asset state so planning turns into shipping."
            eyebrow="Calendar"
            title="Content calendar"
          />
          <div className="content-calendar-grid">
            {contentCalendar.map((item) => (
              <div className="calendar-output-card" key={item.id}>
                <div className="control-card-head">
                  <div>
                    <p className="project-priority">{item.date}</p>
                    <h3>{item.title}</h3>
                  </div>
                  <span className={`status-pill ${outputTone(item.state === "Editing" ? "Watch" : item.state === "Planned" ? "Due" : "Ready")}`}>
                    {item.state}
                  </span>
                </div>
                <p>{item.channel}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="secondary-column">
        {activeIdea ? (
          <article className="panel-card detail-panel">
            <SectionHeader
              detail="Every idea gets a hook, format, and next production action before it can drift."
              eyebrow={activeIdea.format}
              title={activeIdea.title}
            />
            <div className="detail-metrics">
              <div className="detail-metric">
                <span>Pillar</span>
                <strong>{activeIdea.pillar}</strong>
              </div>
              <div className="detail-metric">
                <span>Stage</span>
                <strong>{activeIdea.stage}</strong>
              </div>
              <div className="detail-metric">
                <span>Format</span>
                <strong>{activeIdea.format}</strong>
              </div>
            </div>
            <div className="detail-stack">
              <section className="detail-card">
                <p className="eyebrow">Hook</p>
                <p className="detail-copy">{activeIdea.hook}</p>
              </section>
              <section className="detail-card">
                <p className="eyebrow">Next production move</p>
                <p className="detail-copy">{activeIdea.nextAction}</p>
              </section>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
