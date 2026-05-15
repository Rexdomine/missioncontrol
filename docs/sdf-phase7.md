# SDF Phase 7 — Controlled Thor/helper Review Dispatch

Phase 7 introduces the first controlled live-dispatch-shaped path for Mission Control SDF: an approved queue job can be prepared as a Thor/helper-agent **review-mode operator handoff**.

It is intentionally not a direct agent launcher. The web app records the handoff packet, idempotency key, approval intent, blockers, and exact operator next action. StarLord/Thor still runs any helper-agent session outside the app.

## What is enabled

- Server-only Thor/helper review adapter abstraction: `lib/sdf/thor-launch-adapter.ts`.
- Dispatcher modes: `review-dispatch` and `operator-handoff`.
- Explicit request approval intent: `approvalIntent=rex-approved-review-dispatch`.
- Idempotent prepared handoff packets keyed by run, job, packet, and approval state.
- Queue transition from `approved` to `dispatched-ready` when the review handoff is prepared.
- Audit events for adapter checks, policy failures, review dispatch preparation, blocked dispatch, and operator handoff readiness.
- UI visibility for handoff state, idempotency key, adapter, review-only boundary, latest dispatch result, and exact operator next action.

## What remains disabled

- Direct OpenClaw/Thor/helper-agent spawn from Mission Control.
- GitHub writes, PR comments, status updates, workflow dispatches, branch pushes, or merges.
- Notifications through Telegram, email, Slack, webhooks, or similar outbound channels.
- Production writes or unreviewed automatic execution.

The Thor/helper adapter can be disabled entirely with:

```bash
SDF_THOR_REVIEW_ADAPTER_ENABLED=false
```

Even when enabled, it only prepares an operator packet. It does not run code outside the app.

## Approval and policy requirements

A review handoff is prepared only when all of these are true:

1. A launch request/queue job exists.
2. The launch packet is generated.
3. PR/checkpoint expectations are present.
4. Rex approval is stored as `approved`.
5. The dispatch request includes `approvalIntent: "rex-approved-review-dispatch"`.
6. Blockers are absent or acknowledged by the stored policy.
7. The Thor/helper review adapter is enabled.

Missing approval, missing launch packet/job, unresolved blockers, disabled adapter, or live-mode intent returns a blocked dispatch with no side effects.

## Operator handoff process

1. Rex records approval in `/sdf` with **Record Rex approval + queue**.
2. Rex/StarLord clicks **Prepare review handoff** or calls the dispatch API in `review-dispatch` mode.
3. Mission Control records the prepared handoff and marks the queue job `dispatched-ready`.
4. StarLord/Thor operator copies the handoff packet into a separate Thor/helper-agent review-mode session.
5. The operator records branch, commit, verification, PR link, blockers, and outcome back in Mission Control.

## API examples

Prepare a review handoff:

```http
POST /api/sdf/runs/{id}/dispatch
Content-Type: application/json

{
  "mode": "review-dispatch",
  "intent": "review-dispatch",
  "approvalIntent": "rex-approved-review-dispatch",
  "reviewOnly": true,
  "dryRun": true,
  "jobId": "launch-job-id"
}
```

Expected safe outcomes:

- `prepared` — handoff packet was recorded; waiting for operator.
- `idempotent-hit` — same approved handoff already exists.
- `blocked` — missing approval, missing job, missing explicit intent, unresolved blockers, disabled adapter, or live mode.

## Phase 8 path

Phase 8 can wire a real OpenClaw launch bridge only if Mission Control gets a secure backend integration that supports least privilege, explicit Rex approval, review mode, audit IDs, retry/idempotency controls, and a kill/rollback path. GitHub write and notification adapters should remain separate approvals rather than being bundled into the Thor/helper bridge.
