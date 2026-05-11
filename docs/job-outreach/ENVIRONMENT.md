# Job Outreach Live Connector Environment

Secrets and live connector values should stay outside git. The scripts load this file by default:

```text
/home/node/.openclaw/workspace/state/job-outreach-live.env
```

Required values for the approved-send pipeline:

```bash
JOB_OUTREACH_SPREADSHEET_ID=19QDgwHRwSyNxMgTBy7_78eq6Ff2jkEmik01HmoSc5D0
JOB_OUTREACH_SENDER_EMAIL=rextechng@gmail.com
JOB_OUTREACH_SENDER_NAME=Princewill Ejiogu
CALENDLY_LINK=https://calendly.com/...
JOB_OUTREACH_MODE=approved_send
JOB_OUTREACH_RESUME_URL=https://drive.google.com/file/d/.../view
JOB_OUTREACH_RESUME_DRIVE_FILE_ID=ADD_DRIVE_FILE_ID
```

Required for production lead sourcing:

```bash
# Free-first public hiring sources do not need API keys.
# Target companies are optional fallback boards for Greenhouse/Lever after the free public API pass.
JOB_OUTREACH_TARGET_COMPANIES_JSON='[
  {"name":"Example AI","domain":"example.ai","greenhouseBoardToken":"example-ai"},
  {"name":"Example SaaS","domain":"example.com","leverSlug":"example"}
]'
JOB_OUTREACH_TARGET_ROLES="AI Native Fullstack Engineer,AI Engineer,Python Engineer,React Engineer,Full Stack Engineer,Product Engineer,Founding Engineer"
JOB_OUTREACH_DECISION_MAKER_TITLES="Founder,CTO,Head of Engineering,Engineering Manager,Talent Partner"

# Paid enrichment fallback. Helpful, but the source pass can still collect application links without these.
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

- `JOB_OUTREACH_MODE=approved_send` means only rows explicitly marked `Approved` + `Send on Approval` can send.
- Himalayas, Remotive, Jobicy, Arbeitnow, HN Who’s Hiring, Greenhouse, and Lever source companies actively hiring from public job data; they do not email anyone.
- Application links and public contact emails are captured before paid enrichment. Findymail/LeadMagic enrich decision-makers only when needed; Hunter/Dropcontact verify/enrich fallback data.
- Gmail sending should only run from approval-queue rows and must check suppression first.
- The queue processor refuses to run without `JOB_OUTREACH_RESUME_URL` and inserts that Google Drive CV link into every outreach email body.
- Activity Log and Daily Metrics are updated on committed source runs.
