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

## Software Development Factory Phase 9

SDF Phase 9 connects the Phase 8 OpenClaw/operator outbox to a safe review-mode execution bridge:

- typed `OperatorExecutionRecord` entries for prepared outbox items
- server-only `openclaw-review-queue` adapter boundary at `lib/sdf/openclaw-execution-adapter.ts`
- `POST /api/sdf/runs/[id]/operator-bridge/execute` for queue, start-review, complete-review, block, cancel, and fail lifecycle operations
- explicit `approvalIntent: "rex-approved-review-dispatch"` plus `reviewOnly: true` before queueing execution
- idempotent execution queueing keyed by run, bridge item, handoff, queue job, bridge idempotency key, and packet hash
- UI controls for execution readiness, queued jobs, copyable operator command/packet, current state, result summary, blockers, and audit events

Phase 9 is still review-mode only. Mission Control does not spawn OpenClaw sessions, run shell commands, mutate GitHub, send notifications, write production, or perform autonomous external side effects. If a direct OpenClaw execution env flag is requested, the adapter still blocks it until a secure in-app sessions API and explicit Rex approval exist. See `docs/sdf-phase9.md` for the execution lifecycle, adapter boundary, approval/idempotency rules, and Phase 10 path.

## Software Development Factory Phase 8

SDF Phase 8 adds a safe OpenClaw/operator bridge outbox for approved `/sdf` handoff packets:

- typed `OperatorBridgeOutboxItem` and `OperatorExecutionPacket` models
- `POST /api/sdf/runs/[id]/operator-bridge` for prepare, claim, review-running, complete, block, cancel, and fail lifecycle operations
- explicit `approvalIntent: "rex-approved-review-dispatch"` plus `reviewOnly: true` before bridge preparation
- idempotent bridge preparation for approved queue jobs
- UI controls for bridge readiness, outbox state, lifecycle transitions, structured packet copy/export, and clear next actions
- non-secret audit events for prepared, idempotent-hit, claimed, review-running, review-completed, blocked, cancelled, and failed states

Phase 8 is still review-mode only. Mission Control does not spawn OpenClaw sessions, run shell commands, mutate GitHub, send notifications, write production, or perform autonomous external side effects. StarLord/Thor uses the prepared packet manually or through a future approved server bridge. See `docs/sdf-phase8.md` for the outbox lifecycle, API examples, approval/idempotency rules, and Phase 9 path.

## Software Development Factory Phase 7

SDF Phase 7 adds the first controlled review-dispatch path for `/sdf`:

- server-only Thor/helper review adapter abstraction at `lib/sdf/thor-launch-adapter.ts`
- `POST /api/sdf/runs/[id]/dispatch` support for `review-dispatch` / `operator-handoff`
- explicit `approvalIntent: "rex-approved-review-dispatch"` before handoff preparation
- idempotent prepared handoff packets for approved queue jobs
- queue state transition to `dispatched-ready` when the review-mode operator packet is prepared
- non-secret audit events for adapter checks, policy failures, review dispatch prepared, blocked dispatch, and operator handoff readiness
- UI controls that show approval, queued/prepared/waiting-for-operator state, handoff packet metadata, idempotency key, latest dispatch result, and exact operator next action

Phase 7 still performs no direct external execution. The web app does not spawn Thor/helper agents, mutate GitHub, send notifications, write production, or run unreviewed automation. StarLord/Thor must execute the prepared packet outside the app in review mode. See `docs/sdf-phase7.md` for approval requirements, adapter boundaries, API examples, and the Phase 8 launch-bridge path.

## Software Development Factory Phase 6

SDF Phase 6 added the backend-only dispatcher review foundation for `/sdf`:

- server-only dispatcher module at `lib/sdf/dispatcher.ts`
- `POST /api/sdf/runs/[id]/dispatch` for explicit dry-run/review dispatch previews
- idempotent dispatch attempts for approved launch queue jobs
- least-privilege adapter capability matrix for Thor/helper launch, GitHub writes, and notifications
- non-secret audit events for preview, blocked dispatch, approved dry-run, adapter checks, and policy failures
- UI controls that show the latest dispatch plan, live blocker reasons, and why external writes remain disabled

Phase 6 performed no live external side effects by default. Agent spawning, GitHub mutations, outbound messages, and production writes remained blocked. See `docs/sdf-phase6.md` for the dispatcher architecture.

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
