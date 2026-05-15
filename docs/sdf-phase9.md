# SDF Phase 9 — OpenClaw/operator review-mode execution bridge

Phase 9 connects the Phase 8 operator outbox to an approved execution bridge **without** turning Mission Control into an autonomous agent runner.

The bridge is intentionally a review-mode queue. Mission Control creates typed execution records from prepared outbox items, preserves idempotency and audit history, and produces copyable operator packets/commands for StarLord or Thor to run outside the app. The app still does not spawn OpenClaw sessions, run shell commands, mutate GitHub, send notifications, write production, or perform unreviewed external side effects.

## What changed

- Added typed `OperatorExecutionRecord` entries on each SDF run.
- Added a server-only OpenClaw execution adapter boundary in `lib/sdf/openclaw-execution-adapter.ts`.
- Added `POST /api/sdf/runs/[id]/operator-bridge/execute` for queue/start/complete/block/cancel/fail review-mode execution records.
- Updated `/sdf` to show execution bridge readiness, queued execution records, lifecycle controls, result summary, blockers, audit events, and copyable operator commands.
- Kept direct/live execution disabled even when `SDF_OPENCLAW_DIRECT_EXECUTION_ENABLED=true` is requested, because Mission Control does not have a secure in-app OpenClaw sessions API.

## Execution lifecycle

Execution records are explicit and audit-visible:

- `pending-review` — reserved typed state for records that need review before queueing.
- `queued-for-operator` — a prepared bridge item has been queued for StarLord/Thor review-mode execution.
- `running-review` — an operator marked the copied packet as running outside Mission Control.
- `completed-review` — an operator recorded completion and should add branch, commit, PR, verification, and blockers as review evidence.
- `blocked` — queueing or execution is blocked.
- `cancelled` — execution was cancelled without external side effects.
- `failed` — execution failed safely without external side effects.

## API contract

Endpoint:

```http
POST /api/sdf/runs/:id/operator-bridge/execute
```

Queue execution from a prepared outbox item:

```json
{
  "action": "queue",
  "approvalIntent": "rex-approved-review-dispatch",
  "reviewOnly": true,
  "bridgeItemId": "operator-bridge-...",
  "actor": "System",
  "operatorTarget": "StarLord/Thor operator"
}
```

Start/complete execution:

```json
{
  "action": "start-review",
  "executionId": "operator-execution-...",
  "actor": "System",
  "resultSummary": "StarLord/Thor started this packet in a separate review-mode flow."
}
```

```json
{
  "action": "complete-review",
  "executionId": "operator-execution-...",
  "actor": "System",
  "resultSummary": "Review-mode execution completed; branch, commit, PR, verification, and blockers are ready for Rex review."
}
```

Supported actions:

- `queue`
- `start-review`
- `complete-review`
- `block`
- `cancel`
- `fail`

## Approval and idempotency

Queueing requires:

1. a prepared/claimed/review-running Phase 8 bridge item,
2. `approvalIntent=rex-approved-review-dispatch`, and
3. `reviewOnly=true`.

Repeated valid queue calls return the existing execution record using the Phase 9 idempotency key:

```text
phase9-openclaw-review-execution-record-v1 | run id | bridge item id | handoff id | queue job id | bridge idempotency key | packet hash
```

Missing approval, missing prepared outbox item, unsupported live execution, and disabled direct adapter paths return clear blockers and record no unsafe side effects.

## Adapter boundary

The Phase 9 adapter is server-only and deliberately conservative:

- Adapter: `openclaw-review-queue`
- Mode: review queue only
- Direct execution: disabled
- Live execution: blocked
- Output: typed execution record plus copyable command/packet

If `SDF_OPENCLAW_DIRECT_EXECUTION_ENABLED=true` is set, the adapter reports that direct execution was requested but remains blocked because no secure in-app OpenClaw sessions API exists. A later phase can wire a real execution hook only after Rex approves the secure contract, credential model, review-mode limits, and audit semantics.

## Manual/operator flow

1. Rex approves a review-mode launch request.
2. Mission Control prepares a Phase 8 OpenClaw/operator bridge outbox item.
3. Mission Control queues a Phase 9 review-mode execution record from that outbox item.
4. StarLord/Thor copies the command or packet from `/sdf`.
5. The operator runs the packet outside Mission Control in review mode only.
6. The operator records `running-review`, `completed-review`, `blocked`, `cancelled`, or `failed` in Mission Control.
7. Branch, commit, PR link, verification output, blockers, and next actions remain visible review evidence; the app does not perform those writes itself.

## Safety boundaries

Still disabled from Mission Control:

- GitHub writes, comments, statuses, pushes, merges, or workflow dispatches
- notifications or outbound messages
- production writes or deploys
- shell execution from the app
- direct OpenClaw/agent spawning from the app
- autonomous live execution

Enabled in Phase 9:

- typed execution records
- idempotent review-mode queueing
- server-only adapter readiness reporting
- copyable operator commands/packets
- lifecycle state transitions
- non-secret audit trail events

## Phase 10 path

Phase 10 can add controlled real review-mode OpenClaw execution only after explicit Rex approval and a secure sessions API exists. The recommended contract is:

- disabled by default behind env/config,
- review-mode only by default,
- least-privilege credential boundary,
- no GitHub/notification/production writes unless each adapter is separately approved,
- idempotent job submission with replay protection,
- append-only audit trail with operator result summaries,
- clear fallback to the Phase 9 manual copyable packet flow.
