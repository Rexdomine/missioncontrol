import {
  handoffPackets,
  operatingCadenceItems,
  pauseResumeMarkers,
  type HandoffPacket,
  type PauseResumeMarker,
} from "./mission-control-data";
import { SectionHeader } from "./mission-control-sections";

function handoffTone(state: HandoffPacket["state"] | PauseResumeMarker["status"]) {
  if (state === "Ready" || state === "Active") return "good";
  if (state === "In review" || state === "Watch") return "warning";
  return "risk";
}

export function HandoffModule() {
  const readyPackets = handoffPackets.filter((packet) => packet.state === "Ready").length;
  const pausedLanes = pauseResumeMarkers.filter((marker) => marker.status === "Paused").length;

  return (
    <section className="content-grid handoff-grid">
      <div className="primary-column">
        <article className="panel-card handoff-hero-panel">
          <SectionHeader
            detail="Phase 7 turns the polished Agent OS into a safer handoff layer: every active, paused, and review-ready lane now carries a compact resume packet."
            eyebrow="Handoff layer"
            title="Pause, resume, and review without replaying chat history"
          />
          <div className="handoff-score-grid">
            <div className="trust-score-card">
              <span>Ready packets</span>
              <strong>{readyPackets}/{handoffPackets.length}</strong>
              <p>Reviewable or executable work has a handoff summary attached.</p>
            </div>
            <div className="trust-score-card">
              <span>Paused lanes</span>
              <strong>{pausedLanes}</strong>
              <p>Paused work stays explicit instead of becoming hidden context debt.</p>
            </div>
            <div className="trust-score-card">
              <span>Cadences</span>
              <strong>{operatingCadenceItems.length}</strong>
              <p>Daily, weekly, PR, and resume routines have visible outputs.</p>
            </div>
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="Each packet tells Rex what changed, what evidence exists, and who owns the next decision."
            eyebrow="Review packets"
            title="Handoff-ready work"
          />
          <div className="handoff-packet-grid">
            {handoffPackets.map((packet) => (
              <div className="handoff-packet-card" key={packet.id}>
                <div className="approval-topline">
                  <div>
                    <p className="project-priority">{packet.owner}</p>
                    <h3>{packet.title}</h3>
                  </div>
                  <span className={`status-pill ${handoffTone(packet.state)}`}>{packet.state}</span>
                </div>
                <p>{packet.summary}</p>
                <ul className="detail-list compact-list">
                  {packet.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <strong>{packet.nextAction}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="secondary-column">
        <article className="panel-card accent-card">
          <SectionHeader
            detail="Switching projects should preserve the exact resume point and avoid accidental cross-lane work."
            eyebrow="Pause / resume"
            title="Lane markers"
          />
          <div className="pause-marker-list">
            {pauseResumeMarkers.map((marker) => (
              <div className="pause-marker-card" key={marker.id}>
                <div className="approval-topline">
                  <h3>{marker.project}</h3>
                  <span className={`status-pill ${handoffTone(marker.status)}`}>{marker.status}</span>
                </div>
                <p>{marker.reason}</p>
                <div className="trigger-line">
                  <span>Resume when</span>
                  <strong>{marker.resumeWhen}</strong>
                </div>
                <div className="provenance-strip wrap">
                  {marker.preservedContext.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="Operating cadence makes Mission Control useful between big implementation pushes."
            eyebrow="Cadence"
            title="Default operating outputs"
          />
          <div className="cadence-list">
            {operatingCadenceItems.map((item) => (
              <div className="cadence-card" key={item.id}>
                <span>{item.cadence}</span>
                <h3>{item.title}</h3>
                <p>{item.signal}</p>
                <strong>{item.output}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
