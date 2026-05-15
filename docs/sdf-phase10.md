# SDF Phase 10 — Secure OpenClaw sessions bridge contract

Phase 10 defines the secure boundary for real review-mode OpenClaw execution without enabling live execution from Mission Control yet.

Mission Control can now build, validate, and audit a disabled-by-default sessions bridge submission request from a prepared Phase 9 execution record. Dry-run submissions are allowed so Rex can inspect the contract, allowlist, approval proof, idempotency, blockers, and next action. Live submission remains blocked because no approved in-app OpenClaw sessions API client is wired in this phase.

## What changed

- Added `OpenClawSessionsBridgeRequest` / `OpenClawSessionsBridgeResponse` TypeScript contracts.
- Added `lib/sdf/openclaw-sessions-bridge.ts` as a server-only readiness, allowlist, validation, and idempotency boundary.
- Added `POST /api/sdf/runs/[id]/operator-bridge/execute/submit` for dry-run or blocked live submission attempts.
- Added `submissionAttempts` to each `OperatorExecutionRecord` so repeated requests with the same idempotency key return the existing attempt/result.
- Updated `/sdf` to show sessions bridge readiness, env/config state, allowlisted target, submission attempts, blockers, audit event id, idempotency, and next action.

## Sessions API request contract

Schema version: `mission-control.openclaw.sessions.review.v1`

Required request fields:

- `runId`
- `executionId`
- `handoffId`
- `idempotencyKey`
- `target.targetId`
- `target.agentId`
- `target.operator`
- `target.mode = "review"`
- `taskPacket`
- `allowlistedRepoPath`
- `approvalProof`
- `auditContext`
- `createdAt`
- `requestedBy`

Example dry-run body:

```json
{
  "action": "dry-run",
  "executionId": "operator-execution-...",
  "handoffId": "openclaw-operator-handoff-...",
  "idempotencyKey": "operator-execution-idempotency-key",
  "target": {
    "targetId": "thor-review-mission-control",
    "agentId": "thor",
    "operator": "Thor",
    "mode": "review"
  },
  "allowlistedRepoPath": "/home/node/.openclaw/workspace/missioncontrol",
  "approvalProof": {
    "approvalIntent": "rex-approved-review-dispatch",
    "approvedBy": "Rex",
    "approvedAt": "2026-05-15T00:00:00.000Z",
    "approvalNote": "Rex approved review-mode bridge validation only."
  },
  "requestedBy": "System",
  "auditReason": "Phase 10 review-mode sessions bridge dry-run."
}
```

## Response contract

Responses include:

- `accepted`
- `blocked`
- `sessionId` / `jobId` if a future approved API creates one
- `idempotencyStatus` (`new` or `replayed`)
- `blockerReasons`
- `auditEventId`
- `nextAction`

In Phase 10, dry-run can be `accepted=true`; live `submit` is blocked by readiness until a secure OpenClaw sessions API client is explicitly approved and implemented.

## Credentials and config boundary

Required server-only env for future live submission:

- `SDF_OPENCLAW_BRIDGE_ENABLED=true`
- `SDF_OPENCLAW_BRIDGE_ENDPOINT`
- `SDF_OPENCLAW_BRIDGE_TOKEN`
- `SDF_OPENCLAW_BRIDGE_CONTRACT_VERSION=mission-control.openclaw.sessions.review.v1`

Least privilege expectations:

- Token must be scoped only to create review-mode sessions for allowlisted targets.
- Token must not grant shell, GitHub write, messaging, production deploy, or unrelated workspace access.
- Endpoint and token stay server-only. They are never exposed to the browser or committed.
- Live submission also needs an approved client implementation and audit model; env alone is not enough in Phase 10.

## Allowlist policy

Default non-secret policy allows only:

- `targetId`: `thor-review-mission-control`
- `agentId`: `thor`
- `operator`: `Thor`
- `mode`: `review`
- `repoPath`: `/home/node/.openclaw/workspace/missioncontrol` and descendants

Unknown targets, non-review modes, or paths outside that repo scope are blocked and audited before any external side effect.

## Idempotency

Submission attempts are keyed with:

```text
phase10-openclaw-sessions-bridge-submission-v1 | execution id | handoff id | requested idempotency key | action
```

A repeated dry-run or submit request with the same key returns the existing attempt and response with `idempotencyStatus="replayed"`.

## Audit model

Each new submission attempt records a non-secret SDF audit event with:

- execution id
- attempt id
- action (`dry-run` or `submit`)
- target id
- accepted/blocked state
- bridge readiness state

No shell commands, OpenClaw sessions, GitHub writes, notifications, production writes, or external messages are performed by Mission Control in Phase 10.

## Phase 11 enablement checklist

Before enabling real review-mode OpenClaw execution:

1. Approve the final OpenClaw sessions API contract and response semantics.
2. Provision least-privilege server-only credentials.
3. Confirm the sessions endpoint supports idempotency keys and replay-safe responses.
4. Keep target/repo allowlists in code/config with review-mode only as the default.
5. Add a real client adapter with request timeout, structured errors, and no shell fallback.
6. Extend audit events to store session/job ids and external API correlation ids.
7. Exercise live submit in a non-production preview with no GitHub/message/production write scopes.
8. Require Rex approval before turning on `SDF_OPENCLAW_BRIDGE_ENABLED=true` in any shared environment.
