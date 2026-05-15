# SDF Phase 8 — OpenClaw/operator bridge outbox

Phase 8 wires the safe bridge foundation between approved SDF handoff packets and a StarLord/Thor OpenClaw operator flow.

The bridge is intentionally an **outbox**, not a direct agent launcher. Mission Control prepares an auditable review-mode packet that an operator can copy, claim, run, and complete outside the app. The web app still does not run shell commands, spawn OpenClaw sessions, mutate GitHub, send notifications, write production, or perform autonomous external side effects.

## What changed

- Added a typed `OperatorBridgeOutboxItem` model on each SDF run.
- Added a structured `OperatorExecutionPacket` with:
  - schema version
  - handoff id
  - run id
  - queue job id
  - idempotency key
  - packet hash
  - review-mode-only and external-side-effects-disabled flags
  - operator instructions
  - disabled action list
  - the full SDF task packet
  - audit metadata
- Added `POST /api/sdf/runs/[id]/operator-bridge` for bridge lifecycle operations.
- Updated `/sdf` to show bridge readiness, outbox state, lifecycle controls, and the structured execution packet.

## Lifecycle states

The outbox lifecycle is explicit and audit-visible:

- `prepared` — an approved review-mode packet is ready for StarLord/Thor to claim.
- `claimed` — an operator has claimed the packet outside the web app.
- `review-running` — an operator marked review-mode execution as running.
- `review-completed` — an operator marked review-mode execution complete and should record branch, commit, PR, verification, and blockers.
- `blocked` — preparation or operator execution is blocked.
- `cancelled` — the outbox item was cancelled without external side effects.
- `failed` — the outbox item failed safely without external side effects.

## API contract

Endpoint:

```http
POST /api/sdf/runs/:id/operator-bridge
```

Prepare a bridge item:

```json
{
  "action": "prepare",
  "approvalIntent": "rex-approved-review-dispatch",
  "reviewOnly": true,
  "jobId": "launch-job-...",
  "actor": "System",
  "approvalNote": "Rex approved review-mode OpenClaw/operator bridge only."
}
```

Transition an item:

```json
{
  "action": "claim",
  "bridgeItemId": "operator-bridge-...",
  "operator": "StarLord/Thor operator",
  "actor": "System",
  "note": "Operator claimed the packet for review-mode execution."
}
```

Supported actions:

- `prepare`
- `claim`
- `start-review`
- `complete-review`
- `block`
- `cancel`
- `fail`

## Approval and idempotency

Preparation requires both:

1. a launch queue job created from the SDF run, and
2. explicit review-mode approval intent:

```json
{
  "approvalIntent": "rex-approved-review-dispatch",
  "reviewOnly": true
}
```

Repeated valid prepare calls return the existing bridge item using the Phase 8 idempotency key:

```text
phase8-openclaw-operator-bridge-v1 | run id | queue job id | launch idempotency key | packet hash | approval state
```

A missing approval intent is blocked and audited. Live/external execution remains blocked even if the run has approved launch state.

## Operator flow

1. Rex approves a review-mode handoff packet.
2. Mission Control prepares an OpenClaw/operator bridge outbox item.
3. StarLord/Thor claims the item and copies the structured execution packet into an external OpenClaw operator flow.
4. The operator runs in review mode only.
5. The operator records lifecycle state back in Mission Control: claimed, review-running, review-completed, blocked, cancelled, or failed.
6. Branch, commit, PR, verification, and blockers are still recorded as review evidence; Mission Control does not perform those external writes itself.

## Safety boundaries

Disabled in Phase 8:

- GitHub writes, comments, statuses, pushes, merges, and workflow dispatches
- notifications or outbound messages
- production writes or deploys
- shell execution from the app
- direct OpenClaw session spawning from the app
- autonomous live execution

Enabled in Phase 8:

- typed packet preparation
- idempotent outbox creation
- operator claim and lifecycle state updates
- non-secret audit trail events
- copy/export/manual operator bridge flow

## Phase 9 path

Phase 9 now connects this outbox to a review-mode execution queue. It still does not directly run OpenClaw sessions from the app; it creates typed execution records and copyable operator packets/commands while preserving explicit approval, idempotency, and audit history. See `docs/sdf-phase9.md` for the current execution bridge and Phase 10 path toward a future approved secure sessions API.
