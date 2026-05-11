# Job Outreach Live Connector Environment

Secrets and live connector values should stay outside git. The scripts load this file by default:

```text
/home/node/.openclaw/workspace/state/job-outreach-live.env
```

Required values for the safe tracking/draft-only pipeline:

```bash
JOB_OUTREACH_SPREADSHEET_ID=19QDgwHRwSyNxMgTBy7_78eq6Ff2jkEmik01HmoSc5D0
JOB_OUTREACH_SENDER_EMAIL=rextechng@gmail.com
JOB_OUTREACH_SENDER_NAME=Princewill Ejiogu
CALENDLY_LINK=https://calendly.com/...
JOB_OUTREACH_MODE=draft_only
JOB_OUTREACH_RESUME_PATH=/home/node/.openclaw/workspace/state/Princewill_Chinedu_Ejiogu_Professional_Resume.pdf
```

Required for production lead sourcing:

```bash
# Public hiring sources do not need API keys, but they do need target companies/boards.
JOB_OUTREACH_TARGET_COMPANIES_JSON='[
  {"name":"Example AI","domain":"example.ai","greenhouseBoardToken":"example-ai"},
  {"name":"Example SaaS","domain":"example.com","leverSlug":"example"}
]'
JOB_OUTREACH_TARGET_ROLES="AI Native Fullstack Engineer,AI Engineer,Full Stack Engineer,Product Engineer,Founding Engineer"
JOB_OUTREACH_DECISION_MAKER_TITLES="Founder,CTO,Head of Engineering,Engineering Manager,Talent Partner"

# Primary enrichment waterfall. Provide at least one.
FINDYMAIL_API_KEY=...
LEADMAGIC_API_KEY=...
```

Recommended verification/enrichment fallback:

```bash
HUNTER_API_KEY=...
DROPCONTACT_API_KEY=...
```

Optional values:

```bash
FINDYMAIL_API_BASE=https://api.findymail.com/v1
LEADMAGIC_API_BASE=https://api.leadmagic.io
HUNTER_API_BASE=https://api.hunter.io
DROPCONTACT_API_BASE=https://api.dropcontact.io
CALENDLY_API_KEY=...
JOB_OUTREACH_DAILY_LEAD_LIMIT=50
JOB_OUTREACH_DAILY_SEND_LIMIT=25
JOB_OUTREACH_MIN_SCORE_TO_DRAFT=70
```

Safety defaults:

- `JOB_OUTREACH_MODE` must remain `draft_only` for MVP.
- Greenhouse and Lever source companies actively hiring from public job APIs; they do not email anyone.
- Findymail/LeadMagic enrich decision-makers and emails; Hunter/Dropcontact verify/enrich fallback data.
- Gmail sending/drafting should only run from approval-queue rows and must check suppression first.
- Gmail draft creation refuses to run without `JOB_OUTREACH_RESUME_PATH` and attaches that CV PDF to every outreach draft.
- Activity Log and Daily Metrics are updated on committed source runs.
