# Interview Pipeline Mission Control

Draft-only MVP for a targeted interview outreach pipeline inside OpenClaw Mission Control.

## Guardrails

- Default mode is `Draft Only`; auto-send is disabled.
- Every lead, draft, reply, follow-up, and interview must be logged before action.
- Suppression list is checked before any draft/send work.
- Opt-outs, bounces, and negative replies stop follow-ups.
- Apollo access must respect API access, pricing limits, rate limits, and terms.
- Google Sheets is the source-of-truth tracking layer through the connected Maton Google Workspace path.

## MVP Surfaces

- KPI cards for daily activity.
- Lead pipeline grouped by status.
- Approval queue with draft preview and action buttons.
- Follow-up queue.
- Replies inbox with classification and suggested Calendly response.
- Interviews section.
- Daily metrics/report.

## Files

- `lib/job-outreach/schema.ts` — sheet tabs, headers, settings, and safe config defaults.
- `lib/job-outreach/scoring.ts` — deterministic 0–100 lead scoring helper.
- `components/job-outreach-mission-control.tsx` — Mission Control dashboard module.
- `docs/job-outreach/CONFIG.example.json` — deploy/runtime config template.
