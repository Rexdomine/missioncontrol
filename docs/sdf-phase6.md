# SDF Phase 6 — Dispatcher Review Foundation

Phase 6 adds the first server-only dispatcher boundary for Mission Control's Software Development Factory (SDF). It is intentionally a **dry-run/review foundation**: the app can evaluate approved launch queue jobs and record dispatch plans, but it does not spawn agents, mutate GitHub, send messages, or perform any external write.

## Safety model

- Default mode is `dry-run` / `review`.
- Live execution is disabled in code for this phase.
- Every live-write adapter reports `writeEnabled: false` and a blocker reason.
- The dispatcher records non-secret audit events for preview, blocked dispatch, approved dry-run, adapter readiness checks, and policy failures.
- Repeated dry-run requests use an idempotency key based on run, queue job, task packet hash, mode, and dispatcher version.

## Backend modules

- `lib/sdf/dispatcher.ts` owns the server-only dispatch boundary.
- `lib/sdf/store.ts` persists dispatch attempts alongside runs and launch queue jobs.
- `app/api/sdf/runs/[id]/dispatch/route.ts` exposes dispatcher readiness and dispatch preview.

## Dispatch API

`POST /api/sdf/runs/:id/dispatch`

Request body should make review intent explicit:

```json
{
  "mode": "dry-run",
  "dryRun": true,
  "reviewOnly": true,
  "intent": "preview",
  "jobId": "launch-job-..."
}
```

A successful dry-run returns `{ run, dispatch }`, where `dispatch.plan` includes:

- approved/blocked state
- adapter capability matrix
- planned steps
- blocker reasons
- idempotency key

A live request such as `{ "mode": "live", "intent": "live" }` returns a blocked dispatch result and records that no external side effects occurred.

## Adapter boundary

Phase 6 defines the least-privilege interface for future live dispatch targets:

| Adapter | Phase 6 status | Capability |
| --- | --- | --- |
| Thor/helper-agent launch | blocked | Dry-run packet planning only |
| GitHub write/comment/status | blocked | Dry-run intended handoff only |
| Notification | blocked | Dry-run notification review only |

All adapters include capability flags:

- `readOnly`
- `writeEnabled`
- `requiresApproval`
- `supportsDryRun`

## Approval and idempotency

The dispatcher consumes launch queue jobs created by the Phase 5 approval policy. A dry-run dispatch is approved only when:

1. a queue job exists,
2. Rex approval is recorded on that job,
3. the launch packet and PR/checkpoint expectations are present, and
4. the request is explicitly dry-run/review.

Even then, live execution remains blocked because write adapters are not enabled in Phase 6.

## Phase 7 path

Phase 7 can add live execution by replacing the disabled adapters with least-privilege implementations, behind explicit Rex approval and environment readiness checks. Recommended order:

1. add a real Thor/helper launch adapter with dry-run parity tests,
2. add scoped GitHub comment/status writes only after PR target validation,
3. add notification delivery with explicit recipient/channel allowlists,
4. require a final live-dispatch confirmation body and audit event before every external write.
