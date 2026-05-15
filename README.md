# Mission Control

Mission Control is the visual dashboard and Agent OS console for working with StarLord, Thor, background automations, project memory, and execution workflows.

## Initial Scope

- Today
- Agent OS
- Projects
- Calendar
- Job Hunt
- Content
- Approvals & Alerts
- Chat with StarLord

## Repo Contents

- `app/` - Next.js app shell
- `docs/architecture.md` - technical architecture
- `docs/phases.md` - delivery roadmap and UI phases

## Getting Started

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

## Preview Workflow

Default development binds to `127.0.0.1` only. That keeps the Next.js dev server off the LAN unless you explicitly choose otherwise.

Primary testing path:

- open a branch or PR
- let Vercel create the preview deployment
- verify the Vercel preview URL before handoff

Local checks before any preview handoff:

```bash
npm run lint
npm run typecheck
npm run build
```

The dev and build scripts rotate stale `.next` output into `.next.stale-*` so cached runtime artifacts do not poison the next run.

## Local Fallback Preview

If a hosted preview is temporarily unavailable, use the local tunnel only as a short-lived fallback:

```bash
npm run dev
```

In a second terminal:

```bash
npm run preview:tunnel
```

That creates a temporary `trycloudflare.com` URL that forwards to the local app without exposing the dev server directly on the network.

LAN fallback, only when you specifically want same-network device access:

```bash
npm run dev:lan
```

Security notes:

- Prefer Vercel preview deployments over temporary tunnels.
- Prefer the tunnel flow over LAN exposure when a temporary public URL is needed.
- Stop the tunnel when you are done previewing.
- Treat the preview URL as sensitive while it is active.
- Do not use the LAN mode on untrusted or shared networks.

## Notes

Phase 1 of the Agent OS is intentionally frontend-first. It establishes the operating model, typed seed data, and reviewable UI surfaces before replacing the static data with real telemetry from sessions, commands, memory, tools, GitHub, and scheduler state.

## Software Development Factory Phase 6

SDF Phase 6 adds the backend-only dispatcher review foundation for `/sdf`:

- server-only dispatcher module at `lib/sdf/dispatcher.ts`
- `POST /api/sdf/runs/[id]/dispatch` for explicit dry-run/review dispatch previews
- idempotent dispatch attempts for approved launch queue jobs
- least-privilege adapter capability matrix for Thor/helper launch, GitHub writes, and notifications
- non-secret audit events for preview, blocked dispatch, approved dry-run, adapter checks, and policy failures
- UI controls that show the latest dispatch plan, live blocker reasons, and why external writes remain disabled

Phase 6 still performs no live external side effects by default. Agent spawning, GitHub mutations, outbound messages, and production writes remain blocked until Phase 7+ explicitly enables least-privilege adapters. See `docs/sdf-phase6.md` for the dispatcher architecture and live execution path.

## Software Development Factory Phase 5

SDF Phase 5 adds the live-orchestration safety layer for `/sdf`:

- typed API-backed factory run registry under `/api/sdf/runs`
- safe local file persistence at `.mission-control-data/sdf/runs.json` (ignored)
- server-only, read-only GitHub PR/check sync when `SDF_GITHUB_TOKEN`/`SDF_GITHUB_REPOSITORY` (or GitHub fallbacks) are configured
- manual/simulated fallback with blocker copy when live sync is unavailable
- idempotent Thor/helper launch queue jobs with approval-state-aware keys
- central approval policy covering Rex approval, launch packet, blockers, PR/check expectations, and adapter readiness
- non-secret audit events for run updates, sync attempts, queue decisions, idempotent hits, and approval changes

No external writes are triggered from the UI in this phase. GitHub writes, real agent dispatch, messages, production mutations, and PR actions remain blocked until explicit future backend adapters are implemented and Rex approval policy passes. See `docs/sdf-phase5.md` for environment variables, queue idempotency, approval policy, and the Phase 6 dispatch path.
