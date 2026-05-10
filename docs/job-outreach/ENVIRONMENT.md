# Job Outreach Live Connector Environment

Secrets and live connector values should stay outside git. The scripts load this file by default:

```text
/home/node/.openclaw/workspace/state/job-outreach-live.env
```

Required values:

```bash
APOLLO_API_KEY=...
JOB_OUTREACH_SPREADSHEET_ID=19QDgwHRwSyNxMgTBy7_78eq6Ff2jkEmik01HmoSc5D0
JOB_OUTREACH_SENDER_EMAIL=rextechng@gmail.com
JOB_OUTREACH_SENDER_NAME=Princewill Ejiogu
CALENDLY_LINK=https://calendly.com/...
```

Optional values:

```bash
APOLLO_API_BASE=https://api.apollo.io/api/v1
CALENDLY_API_KEY=...
JOB_OUTREACH_DAILY_LEAD_LIMIT=50
JOB_OUTREACH_DAILY_SEND_LIMIT=25
JOB_OUTREACH_MIN_SCORE_TO_DRAFT=70
JOB_OUTREACH_MODE=draft_only
```

Safety defaults:

- `JOB_OUTREACH_MODE` must remain `draft_only` for MVP.
- Apollo sourcing writes leads to Google Sheets; it does not email anyone.
- Gmail sending/drafting should only run from approval-queue rows and must check suppression first.
