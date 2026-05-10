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

## Live connector commands

All live commands load `/home/node/.openclaw/workspace/state/job-outreach-live.env` by default.

```bash
npm run job-outreach:health
npm run job-outreach:sync-settings
npm run job-outreach:source-apollo -- --limit 20          # dry-run
npm run job-outreach:source-apollo -- --limit 20 --commit # writes Leads + Outreach Queue
npm run job-outreach:create-drafts -- --max 5             # dry-run approved queue rows
npm run job-outreach:create-drafts -- --max 5 --commit    # creates Gmail drafts only
```

The sourcing script refuses to run unless `JOB_OUTREACH_MODE=draft_only` and required live config is present. The Gmail script creates drafts only from `Approved` + `Draft Only` queue rows, checks suppression, and does not send email.
