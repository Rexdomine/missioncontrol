"use client";

import { useMemo, useState } from "react";
import { jobOutreachConfig, jobOutreachTabs } from "@/lib/job-outreach/schema";
import { SectionHeader } from "./mission-control-sections";

type LeadStatus = "New" | "Qualified" | "Drafted" | "Sent" | "Replied" | "Interview Booked" | "Rejected";
type ReplyClass = "Positive" | "Referral" | "Not Interested" | "Out of Office" | "Auto-reply" | "Unclear";

interface OutreachLead {
  id: string;
  name: string;
  company: string;
  role: string;
  score: number;
  status: LeadStatus;
  nextAction: string;
  lastContacted: string;
  personalizationAngle: string;
}

interface ApprovalDraft {
  id: string;
  leadId: string;
  contact: string;
  company: string;
  title: string;
  score: number;
  angle: string;
  subject: string;
  body: string;
}

interface FollowUpItem {
  id: string;
  contact: string;
  company: string;
  previousEmailDate: string;
  followUpNumber: number;
  message: string;
  approvalStatus: "Pending" | "Approved" | "Auto";
}

interface ReplyItem {
  id: string;
  contact: string;
  company: string;
  classification: ReplyClass;
  snippet: string;
  nextAction: string;
  draftedResponse: string;
}

const leads: OutreachLead[] = [
  {
    id: "lead-001",
    name: "Maya Chen",
    company: "FlowForge AI",
    role: "Founder",
    score: 92,
    status: "Drafted",
    nextAction: "Review initial founder draft",
    lastContacted: "Not contacted",
    personalizationAngle: "Company is building AI workflow tools for operations teams.",
  },
  {
    id: "lead-002",
    name: "Daniel Ross",
    company: "Northstar SaaS",
    role: "CTO",
    score: 86,
    status: "Qualified",
    nextAction: "Generate CTO version and queue for approval",
    lastContacted: "Not contacted",
    personalizationAngle: "Hiring signal mentions React, Python, and backend automation.",
  },
  {
    id: "lead-003",
    name: "Amara Okafor",
    company: "Atlas Product Studio",
    role: "Managing Partner",
    score: 78,
    status: "Sent",
    nextAction: "Follow-up 1 due if no reply",
    lastContacted: "May 9, 2026",
    personalizationAngle: "Agency ships client AI tools where founder-style execution is relevant.",
  },
  {
    id: "lead-004",
    name: "Leo Martins",
    company: "QuietLedger",
    role: "Technical Recruiter",
    score: 68,
    status: "New",
    nextAction: "Save only until a stronger hiring signal appears",
    lastContacted: "Not contacted",
    personalizationAngle: "Fintech profile fits, but role signal is still broad.",
  },
  {
    id: "lead-005",
    name: "Priya Shah",
    company: "OpsPilot",
    role: "Head of Product",
    score: 88,
    status: "Replied",
    nextAction: "Draft Calendly response for positive reply",
    lastContacted: "May 8, 2026",
    personalizationAngle: "Product team is expanding AI workflow integrations.",
  },
];

const approvalDrafts: ApprovalDraft[] = [
  {
    id: "queue-001",
    leadId: "lead-001",
    contact: "Maya Chen",
    company: "FlowForge AI",
    title: "Founder",
    score: 92,
    angle: "FlowForge AI is building AI workflow tools for operations teams.",
    subject: "AI/full-stack engineering support for FlowForge AI",
    body:
      "Hi Maya,\n\nI came across FlowForge AI and liked what you’re building around AI workflow tools for operations teams.\n\nI’m Princewill, an AI-native full-stack engineer and founder of CounterFix. I’ve built across React, Python, FastAPI, AI workflows, automation, integrations, and production systems — so I’m strongest where teams need someone who can move from idea to working software quickly.\n\nWould you be open to a quick conversation this week to see if there’s a fit?\n\nBest,\nPrincewill Ejiogu\n\nP.S. If this is not relevant, feel free to let me know and I won’t follow up.",
  },
  {
    id: "queue-002",
    leadId: "lead-002",
    contact: "Daniel Ross",
    company: "Northstar SaaS",
    title: "CTO",
    score: 86,
    angle: "Northstar’s hiring signal maps to React, Python, backend systems, and automation.",
    subject: "Full-stack / AI engineering help for Northstar SaaS",
    body:
      "Hi Daniel,\n\nI noticed Northstar SaaS is hiring around React, Python, backend systems, and automation, and it seems like the kind of environment where strong product engineering speed matters.\n\nI’m Princewill, an AI-native full-stack engineer with founder experience. I work across React, Python/FastAPI, backend systems, automation workflows, AI tooling, integrations, and production deployment.\n\nWould it make sense to have a short conversation to see if my background fits anything you’re building or hiring for?\n\nBest,\nPrincewill Ejiogu\n\nP.S. If this is not relevant, feel free to let me know and I won’t follow up.",
  },
];

const followUps: FollowUpItem[] = [
  {
    id: "follow-001",
    contact: "Amara Okafor",
    company: "Atlas Product Studio",
    previousEmailDate: "May 9, 2026",
    followUpNumber: 1,
    message:
      "Just wanted to follow up on this. I think my background in full-stack engineering, AI tooling, and founder-led product building could be useful if Atlas needs extra technical execution support.",
    approvalStatus: "Pending",
  },
];

const replies: ReplyItem[] = [
  {
    id: "reply-001",
    contact: "Priya Shah",
    company: "OpsPilot",
    classification: "Positive",
    snippet: "This looks relevant — happy to chat next week.",
    nextAction: "Send Calendly draft after review",
    draftedResponse:
      "Hi Priya,\n\nThanks for getting back to me. I’d be happy to chat. You can pick a time that works for you here:\n\n{{Calendly_Link}}\n\nLooking forward to speaking.\n\nBest,\nPrincewill",
  },
  {
    id: "reply-002",
    contact: "Nina Patel",
    company: "ScaleWorks",
    classification: "Out of Office",
    snippet: "I’m away until Monday and will respond when I’m back.",
    nextAction: "Pause follow-up and retry after return date",
    draftedResponse: "No human response drafted. Follow-up schedule paused.",
  },
];

const interviews = [
  {
    id: "interview-001",
    contact: "Pending Calendly booking",
    company: "OpsPilot",
    date: "Waiting",
    time: "Waiting",
    link: "Calendly response draft queued",
    status: "Calendly pending",
    notes: "Positive reply detected; human review required before reply is drafted/sent.",
  },
];

const sourceWaterfall = [
  {
    provider: "Greenhouse public jobs API",
    role: "Primary hiring signal",
    status: "Configured",
    notes: "Find companies actively hiring for Rex’s target roles from public board tokens.",
  },
  {
    provider: "Lever public postings API",
    role: "Secondary hiring signal",
    status: "Configured",
    notes: "Fallback company-role discovery when Greenhouse is not available.",
  },
  {
    provider: "Findymail / LeadMagic",
    role: "Decision-maker enrichment",
    status: "Needs API key",
    notes: "Find founders, CTOs, engineering/product leaders, recruiters, and emails.",
  },
  {
    provider: "Hunter / Dropcontact",
    role: "Verification fallback",
    status: "Needs API key",
    notes: "Verify or enrich email data before qualified leads enter draft queue.",
  },
];

function statusTone(status: LeadStatus | ReplyClass | string) {
  if (["Qualified", "Drafted", "Positive", "Interview Booked", "Booked", "Configured"].includes(status)) return "good";
  if (["Sent", "Out of Office", "Pending", "Calendly pending", "Needs API key"].includes(status)) return "warning";
  if (["Rejected", "Not Interested"].includes(status)) return "risk";
  return "active";
}

export function JobOutreachMissionControl() {
  const [selectedDraftId, setSelectedDraftId] = useState(approvalDrafts[0]?.id ?? "");
  const selectedDraft = approvalDrafts.find((draft) => draft.id === selectedDraftId) ?? approvalDrafts[0];

  const metrics = useMemo(
    () => [
      { label: "Leads sourced today", value: "5" },
      { label: "Qualified leads today", value: "4" },
      { label: "Emails drafted today", value: String(approvalDrafts.length) },
      { label: "Emails sent today", value: "0" },
      { label: "Replies received", value: String(replies.length) },
      { label: "Positive replies", value: String(replies.filter((reply) => reply.classification === "Positive").length) },
      { label: "Interviews booked", value: "0" },
      { label: "Follow-ups due", value: String(followUps.length) },
      { label: "Approval queue", value: String(approvalDrafts.length) },
    ],
    [],
  );

  return (
    <section className="job-outreach-stack">
      <article className="panel-card outreach-safety-panel">
        <SectionHeader
          detail="MVP is intentionally conservative: Greenhouse/Lever sourcing and Gmail execution must pass logging, scoring, suppression, enrichment, and approval gates first."
          eyebrow="Draft-only MVP"
          title="Interview Pipeline Mission Control"
        />
        <div className="outreach-guardrail-grid">
          <div className="detail-card">
            <p className="eyebrow">Mode</p>
            <strong>{jobOutreachConfig.mode.replace("_", " ")}</strong>
            <p className="detail-copy">Auto-send disabled. Approved items create drafts/logs first.</p>
          </div>
          <div className="detail-card">
            <p className="eyebrow">Minimum score</p>
            <strong>{jobOutreachConfig.minimumScoreToDraft}+</strong>
            <p className="detail-copy">Only qualified leads enter the email approval queue.</p>
          </div>
          <div className="detail-card">
            <p className="eyebrow">Suppression</p>
            <strong>Required</strong>
            <p className="detail-copy">Opt-outs, bounces, duplicates, and manual blocks stop outreach.</p>
          </div>
          <div className="detail-card">
            <p className="eyebrow">Activity log</p>
            <strong>Required</strong>
            <p className="detail-copy">Every source, draft, reply, follow-up, and booking is sheet-backed.</p>
          </div>
        </div>
      </article>

      <article className="panel-card">
        <SectionHeader
          detail="Greenhouse and Lever identify active hiring signals first; enrichment providers only run after the company-role fit is clear."
          eyebrow="Lead-source waterfall"
          title="Public hiring APIs before enrichment"
        />
        <div className="outreach-table">
          {sourceWaterfall.map((step) => (
            <div className="outreach-row" key={step.provider}>
              <div>
                <strong>{step.provider}</strong>
                <span>{step.role}</span>
              </div>
              <span className={`status-pill ${statusTone(step.status)}`}>{step.status}</span>
              <p>{step.notes}</p>
              <em>Logged to Activity Log</em>
            </div>
          ))}
        </div>
      </article>

      <article className="panel-card">
        <SectionHeader
          detail="These cards map directly to the Daily Metrics sheet and keep the day’s job-outreach state visible."
          eyebrow="Daily metrics"
          title="Today’s pipeline pulse"
        />
        <div className="outreach-kpi-grid">
          {metrics.map((metric) => (
            <div className="metric-card compact-metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      </article>

      <section className="content-grid outreach-grid">
        <div className="primary-column">
          <article className="panel-card board-panel">
            <SectionHeader
              detail="Leads are grouped by operational state so sourcing, qualification, drafting, replies, and interviews stay connected."
              eyebrow="Lead pipeline"
              title="Leads by status"
            />
            <div className="outreach-table">
              {leads.map((lead) => (
                <div className="outreach-row" key={lead.id}>
                  <div>
                    <strong>{lead.name}</strong>
                    <span>{lead.company} · {lead.role}</span>
                  </div>
                  <span className="score-pill">{lead.score}</span>
                  <span className={`status-pill ${statusTone(lead.status)}`}>{lead.status}</span>
                  <p>{lead.nextAction}</p>
                  <em>{lead.lastContacted}</em>
                </div>
              ))}
            </div>
          </article>

          <article className="panel-card">
            <SectionHeader
              detail="Pending emails must be reviewed before Gmail drafts or any future send action is allowed."
              eyebrow="Approval queue"
              title="Drafts waiting for Rex"
            />
            <div className="approval-draft-grid">
              <div className="approval-draft-list">
                {approvalDrafts.map((draft) => (
                  <button
                    className={`project-card${draft.id === selectedDraft?.id ? " selected" : ""}`}
                    key={draft.id}
                    onClick={() => setSelectedDraftId(draft.id)}
                    type="button"
                  >
                    <div className="project-card-topline">
                      <div>
                        <p className="project-priority">Score {draft.score}</p>
                        <h3>{draft.contact}</h3>
                      </div>
                      <span className="status-pill warning">Pending</span>
                    </div>
                    <p className="project-summary">{draft.company} · {draft.title}</p>
                    <div className="project-focus-line">{draft.angle}</div>
                  </button>
                ))}
              </div>

              {selectedDraft ? (
                <div className="detail-card draft-preview-card">
                  <p className="eyebrow">Email draft</p>
                  <h3>{selectedDraft.subject}</h3>
                  <pre>{selectedDraft.body}</pre>
                  <div className="approval-actions outreach-actions" aria-label="Draft approval actions">
                    <button type="button">Approve draft</button>
                    <button className="secondary" type="button">Edit</button>
                    <button className="secondary" type="button">Reject</button>
                    <button className="secondary" type="button">Suppress</button>
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        </div>

        <div className="secondary-column">
          <article className="panel-card rail-panel">
            <SectionHeader
              detail="Follow-ups remain draft-only and cancel automatically after replies, opt-outs, or bounces."
              eyebrow="Follow-ups"
              title="Due today"
            />
            <div className="waiting-rail">
              {followUps.map((followUp) => (
                <div className="waiting-card" key={followUp.id}>
                  <div className="waiting-card-topline">
                    <h3>{followUp.contact}</h3>
                    <span>F{followUp.followUpNumber}</span>
                  </div>
                  <p>{followUp.company} · Previous: {followUp.previousEmailDate}</p>
                  <p>{followUp.message}</p>
                  <span className={`status-pill ${statusTone(followUp.approvalStatus)}`}>{followUp.approvalStatus}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel-card rail-panel">
            <SectionHeader
              detail="Positive and referral replies create human-reviewed response drafts with Calendly as the next step."
              eyebrow="Replies inbox"
              title="Classified replies"
            />
            <div className="waiting-rail">
              {replies.map((reply) => (
                <div className="waiting-card" key={reply.id}>
                  <div className="waiting-card-topline">
                    <h3>{reply.contact}</h3>
                    <span className={`status-pill ${statusTone(reply.classification)}`}>{reply.classification}</span>
                  </div>
                  <p>{reply.company}: “{reply.snippet}”</p>
                  <p><strong>Next:</strong> {reply.nextAction}</p>
                  <details>
                    <summary>Suggested response</summary>
                    <pre>{reply.draftedResponse}</pre>
                  </details>
                </div>
              ))}
            </div>
          </article>

          <article className="panel-card rail-panel">
            <SectionHeader
              detail="Calendly booking records flow into the Interviews sheet after confirmation."
              eyebrow="Interviews"
              title="Booking tracker"
            />
            <div className="waiting-rail">
              {interviews.map((interview) => (
                <div className="waiting-card" key={interview.id}>
                  <div className="waiting-card-topline">
                    <h3>{interview.company}</h3>
                    <span className={`status-pill ${statusTone(interview.status)}`}>{interview.status}</span>
                  </div>
                  <p>{interview.contact}</p>
                  <p>{interview.date} · {interview.time}</p>
                  <p>{interview.link}</p>
                  <div className="waiting-owner">{interview.notes}</div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="content-grid outreach-grid">
        <article className="panel-card">
          <SectionHeader
            detail="The Google Sheet is the system of record; these tabs are ready for Maton-backed creation and sync."
            eyebrow="Google Sheets"
            title="Job Outreach Pipeline schema"
          />
          <div className="sheet-tab-grid">
            {jobOutreachTabs.map((tab) => (
              <div className="sheet-tab-card" key={tab.name}>
                <strong>{tab.name}</strong>
                <span>{tab.columns.length} columns</span>
                <p>{tab.columns.slice(0, 4).join(" · ")}{tab.columns.length > 4 ? " …" : ""}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card accent-card">
          <SectionHeader
            detail="Generated from sheet-backed counts once live connectors are wired."
            eyebrow="Daily report"
            title="Today’s Outreach Summary"
          />
          <div className="daily-report-card">
            <p>Leads sourced: 5</p>
            <p>Qualified leads: 4</p>
            <p>Emails drafted: {approvalDrafts.length}</p>
            <p>Emails sent: 0</p>
            <p>Replies: {replies.length}</p>
            <p>Positive replies: 1</p>
            <p>Interviews booked: 0</p>
            <p>Follow-ups due tomorrow: 1</p>
            <p>Best lead segment: AI workflow / SaaS founders</p>
            <p>Recommended improvement: add target company board slugs plus Findymail or LeadMagic, then Hunter/Dropcontact for verification fallback.</p>
          </div>
        </article>
      </section>
    </section>
  );
}
