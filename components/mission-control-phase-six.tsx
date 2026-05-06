import {
  actionLogEntries,
  designSystemTokens,
  productStateCards,
  responsiveChecks,
  trustSignals,
  type ActionLogEntry,
  type ProductStateCard,
  type TrustSignal,
} from "./mission-control-data";
import { SectionHeader } from "./mission-control-sections";

function trustTone(status: TrustSignal["status"] | ActionLogEntry["outcome"] | ProductStateCard["state"]) {
  if (status === "Verified" || status === "Success" || status === "Recorded") return "good";
  if (status === "Watch" || status === "Staged" || status === "Loading" || status === "Empty") return "warning";
  return "risk";
}

export function TrustPolishModule() {
  const verifiedSignals = trustSignals.filter((signal) => signal.status === "Verified").length;

  return (
    <section className="content-grid trust-grid">
      <div className="primary-column">
        <article className="panel-card trust-hero-panel">
          <SectionHeader
            detail="Phase 6 makes daily use feel dependable: clearer hierarchy, visible provenance, audit trails, and responsive state feedback."
            eyebrow="Trust layer"
            title="Polished, mobile-ready, and auditable"
          />
          <div className="trust-score-grid">
            <div className="trust-score-card">
              <span>Verified signals</span>
              <strong>{verifiedSignals}/{trustSignals.length}</strong>
              <p>Generated guidance now carries confidence and provenance cues.</p>
            </div>
            <div className="trust-score-card">
              <span>State coverage</span>
              <strong>{productStateCards.length}</strong>
              <p>Empty, loading, failure, and success feedback are represented.</p>
            </div>
            <div className="trust-score-card">
              <span>Responsive checks</span>
              <strong>{responsiveChecks.length}</strong>
              <p>Phone, laptop, and desktop behavior have explicit readiness notes.</p>
            </div>
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="Recommendations and generated summaries should explain the evidence behind them, not just state an answer."
            eyebrow="Confidence + provenance"
            title="Trust indicators"
          />
          <div className="trust-signal-grid">
            {trustSignals.map((signal) => (
              <div className="trust-signal-card" key={signal.id}>
                <div className="approval-topline">
                  <h3>{signal.label}</h3>
                  <span className={`status-pill ${trustTone(signal.status)}`}>{signal.status}</span>
                </div>
                <p>{signal.detail}</p>
                <div className="provenance-strip">
                  <span>Confidence: {signal.confidence}</span>
                  <span>{signal.provenance}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card action-log-panel">
          <SectionHeader
            detail="Action logs make the operating system inspectable, so Rex can see what was recorded, staged, blocked, or verified."
            eyebrow="Auditability"
            title="Action log"
          />
          <div className="action-log-table" role="table" aria-label="Mission Control action log">
            <div className="action-log-row table-head" role="row">
              <span>Time</span>
              <span>Actor</span>
              <span>Action</span>
              <span>Outcome</span>
            </div>
            {actionLogEntries.map((entry) => (
              <div className="action-log-row" key={entry.id} role="row">
                <time>{entry.time}</time>
                <strong>{entry.actor}</strong>
                <div>
                  <p>{entry.action}</p>
                  <span>{entry.surface} · {entry.evidence}</span>
                </div>
                <em className={`status-pill ${trustTone(entry.outcome)}`}>{entry.outcome}</em>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="secondary-column">
        <article className="panel-card">
          <SectionHeader
            detail="States are designed intentionally so the app never feels blank, stuck, or mysterious."
            eyebrow="States + feedback"
            title="Empty, loading, failure, success"
          />
          <div className="state-card-list">
            {productStateCards.map((state) => (
              <div className="state-feedback-card" key={state.id}>
                <div className="approval-topline">
                  <h3>{state.surface}</h3>
                  <span className={`status-pill ${trustTone(state.state)}`}>{state.state}</span>
                </div>
                <p>{state.message}</p>
                <strong>{state.userFeedback}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="Phase 6 prioritizes phone and laptop reliability over decorative rewrites."
            eyebrow="Responsive readiness"
            title="Mobile and laptop polish"
          />
          <div className="responsive-check-list">
            {responsiveChecks.map((check) => (
              <div className="responsive-check-card" key={check.id}>
                <div className="approval-topline">
                  <h3>{check.viewport}</h3>
                  <span>{check.status}</span>
                </div>
                <p>{check.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card design-token-panel">
          <SectionHeader
            detail="Small design-system tokens keep Agent OS surfaces coherent without a risky full redesign."
            eyebrow="Design system pass"
            title="Refined rhythm"
          />
          <div className="design-token-list">
            {designSystemTokens.map((token) => (
              <div className="design-token-card" key={token.id}>
                <span>{token.value}</span>
                <h3>{token.label}</h3>
                <p>{token.purpose}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
