# Interview Pipeline Mission Control

Sheet-approved outreach pipeline inside OpenClaw Mission Control.

## Architecture

The pipeline uses a free-first lead-source waterfall instead of Apollo:

1. **Free public hiring sources** — Himalayas, Remotive, Jobicy, Arbeitnow, HN Who’s Hiring, Greenhouse public boards, and Lever public postings.
2. **Role filter** — keep companies actively hiring for Rex's target roles: AI-native full-stack, AI engineer, Python, React, full-stack, product engineer, founding engineer, frontend/backend, and solutions engineer roles.
3. **Opportunity scoring** — score each opportunity from role match, AI/Python/React/full-stack/product signals, remote fit, application link, and public contact availability.
4. **Opportunity tracking** — store company/job matches, scores, application links, and public contact emails in `Hiring Signals`; these are not treated as person leads unless a contact email is available.
5. **Free contact path first** — use application links and public contact emails before paid enrichment.
6. **Decision-maker enrichment** — use Findymail or LeadMagic only when a free contact path is missing and the opportunity score justifies enrichment.
7. **Fallback verification/enrichment** — use Hunter or Dropcontact when the primary enrichment result needs email verification or secondary enrichment.
8. **Execution** — Gmail sends only after Rex marks a queue row `Approved`; `Needs Rewrite` regenerates a reviewed draft; Calendly remains the booking path.
9. **Mission Control** — dashboard metrics surface hiring signals, contactable leads, qualified leads, drafts, replies, opt-outs, interviews, and connector readiness.

## Guardrails

- Default mode is `approved_send`: only rows explicitly marked `Approved` are sent automatically.
- `Hiring Signals` means company/job opportunity; `Leads` means contact-ready person with full name and email.
- Every source run, enrichment attempt, lead score, send, rewrite, suppression block, reply, follow-up, and interview must be logged.
- Suppression list is checked before any queue/draft work.
- Opt-outs, bounces, and negative replies stop follow-ups.
- Public job APIs are the default sourcing layer; enrichment providers are fallback only and must respect API access, pricing limits, rate limits, and terms.
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
- `scripts/source-job-outreach-waterfall.mjs` — free-first public job API sourcing + enrichment waterfall.
- `scripts/separate-contactable-leads.mjs` — one-time/safety migration to move non-contact rows out of `Leads`.
- `docs/job-outreach/CONFIG.example.json` — deploy/runtime config template.

## Live connector commands

All live commands load `/home/node/.openclaw/workspace/state/job-outreach-live.env` by default.

```bash
npm run job-outreach:health
npm run job-outreach:audit                         # checks live sheet/process invariants without sending
npm run job-outreach:sync-settings
npm run job-outreach:separate-leads                    # move old non-contact lead rows to Hiring Signals
npm run job-outreach:source-leads -- --limit 20          # dry-run
npm run job-outreach:source-leads -- --limit 20 --commit # writes Hiring Signals + contact-ready Leads + Outreach Queue + Activity Log + Daily Metrics
npm run job-outreach:process-queue -- --max 5             # dry-run approved/rewrite queue rows
npm run job-outreach:process-queue -- --max 5 --commit    # sends Approved rows; rewrites Needs Rewrite rows
```

The sourcing script runs only in `draft_only` or `approved_send` mode. The queue processor sends only rows with `Approval Status = Approved` and `Send Mode = Send on Approval`, checks suppression, inserts the configured Google Drive CV link from `JOB_OUTREACH_RESUME_URL`, marks successful rows as `Sent`, writes `Email Activity` with Gmail message ID and follow-up due date, creates the first `Follow Ups` row, increments Daily Metrics emails sent, and leaves `Rejected` rows untouched. `Needs Rewrite` regenerates the email body and resets the row to `Pending`.
