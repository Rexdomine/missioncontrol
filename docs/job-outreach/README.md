# Interview Pipeline Mission Control

Draft-only MVP for a targeted interview outreach pipeline inside OpenClaw Mission Control.

## Architecture

The pipeline uses a lead-source waterfall instead of Apollo:

1. **Hiring signal source** — Greenhouse public job boards first, then Lever public job postings.
2. **Role filter** — keep companies actively hiring for Rex's target roles: AI-native full-stack, AI engineer, full-stack, product engineer, founding engineer, frontend/backend, and solutions engineer roles.
3. **Opportunity tracking** — store company/job matches in `Hiring Signals`; these are not treated as contact-ready leads.
4. **Decision-maker enrichment** — use Findymail or LeadMagic to find founders, CTOs, engineering/product leaders, technical recruiters, talent partners, names, and emails.
5. **Lead creation** — write to `Leads` only when a person has a full name and email address.
6. **Fallback verification/enrichment** — use Hunter or Dropcontact when the primary enrichment result needs email verification or secondary enrichment.
7. **Execution** — Gmail stays Draft Only; Calendly is used only inside reviewed reply/interview booking drafts.
8. **Mission Control** — dashboard metrics surface hiring signals, contactable leads, qualified leads, drafts, replies, opt-outs, interviews, and connector readiness.

## Guardrails

- Default mode is `Draft Only`; auto-send is disabled.
- `Hiring Signals` means company/job opportunity; `Leads` means contact-ready person with full name and email.
- Every source run, enrichment attempt, lead score, draft, reply, follow-up, and interview must be logged.
- Suppression list is checked before any queue/draft work.
- Opt-outs, bounces, and negative replies stop follow-ups.
- Greenhouse and Lever are public hiring-signal sources; enrichment providers must respect API access, pricing limits, rate limits, and terms.
- Google Sheets is the source-of-truth tracking layer through the connected Maton Google Workspace path.

## MVP Surfaces

- KPI cards for daily activity.
- Lead-source waterfall status.
- Hiring Signals for non-contact company/job opportunities.
- Leads for contact-ready people only.
- Approval queue with draft preview and action buttons.
- Follow-up queue.
- Replies inbox with classification and suggested Calendly response.
- Interviews section.
- Daily metrics/report.

## Files

- `lib/job-outreach/schema.ts` — sheet tabs, headers, settings, and safe config defaults.
- `lib/job-outreach/scoring.ts` — deterministic 0–100 lead scoring helper.
- `components/job-outreach-mission-control.tsx` — Mission Control dashboard module.
- `scripts/source-job-outreach-waterfall.mjs` — Greenhouse/Lever sourcing + enrichment waterfall.
- `scripts/separate-contactable-leads.mjs` — one-time/safety migration to move non-contact rows out of `Leads`.
- `docs/job-outreach/CONFIG.example.json` — deploy/runtime config template.

## Live connector commands

All live commands load `/home/node/.openclaw/workspace/state/job-outreach-live.env` by default.

```bash
npm run job-outreach:health
npm run job-outreach:sync-settings
npm run job-outreach:separate-leads                    # move old non-contact lead rows to Hiring Signals
npm run job-outreach:source-leads -- --limit 20          # dry-run
npm run job-outreach:source-leads -- --limit 20 --commit # writes Hiring Signals + contact-ready Leads + Outreach Queue + Activity Log + Daily Metrics
npm run job-outreach:create-drafts -- --max 5             # dry-run approved queue rows
npm run job-outreach:create-drafts -- --max 5 --commit    # creates Gmail drafts only
```

The sourcing script refuses to run unless `JOB_OUTREACH_MODE=draft_only` and required live config is present. The Gmail script creates drafts only from `Approved` + `Draft Only` queue rows, checks suppression, inserts the configured Google Drive CV link from `JOB_OUTREACH_RESUME_URL`, and does not send email.
