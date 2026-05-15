# SDF Phase 5 Live Orchestration Safety Layer

Phase 5 turns the Phase 4 server/API foundations into a safer live-integration layer. It still does **not** dispatch external work automatically.

## What is live in this slice

- `/api/sdf/runs/[id]/sync` can attempt server-only, read-only GitHub PR/check sync.
- `/api/sdf/runs/[id]/launch-requests` creates idempotent launch queue jobs instead of duplicate launch records.
- SDF runs now expose:
  - GitHub live readiness and blocker copy
  - sync source (`live`, `manual`, `simulated`) and last checked time
  - approval policy requirements and blocking reasons
  - launch queue state, idempotency key, packet hash, and dispatch adapter state
  - non-secret audit events for sync, policy/queue decisions, and idempotent hits
- `/sdf` makes the live/readiness/queue state understandable for Rex before Phase 6 execution exists.

## Read-only GitHub sync

The GitHub adapter lives in `lib/sdf/github.ts` and only uses `GET` requests against GitHub REST endpoints:

- `GET /repos/{owner}/{repo}/pulls/{pull_number}`
- `GET /repos/{owner}/{repo}/commits/{sha}/check-runs`

It does **not** push branches, create comments, update PRs, dispatch workflows, or mutate GitHub in any way.

### Environment variables

Use server/runtime environment only. Do not expose these to the browser and do not commit secrets.

- `SDF_GITHUB_TOKEN` preferred, or `GITHUB_TOKEN`
- `SDF_GITHUB_REPOSITORY` preferred, or `GITHUB_REPOSITORY` (example: `Rexdomine/missioncontrol`)
- Optional fallback when a PR URL is not stored on the run: `SDF_GITHUB_PR_NUMBER`

Required token permissions should be read-only:

- Pull requests: read
- Checks/statuses/metadata: read
- Repository contents write, issues write, pull request write, workflow write, and administration permissions are not required for Phase 5.

If credentials, repository, or PR reference are missing, live sync downgrades to a safe manual result, records `Not connected`, and writes the blocker into the run audit trail.

## Idempotent launch queue

The launch route now derives an idempotency key from:

- run id
- generated task packet hash
- approval state
- blocker acknowledgement state
- PR/checkpoint branch, commit, and PR URL

Repeated requests with the same effective packet and approval context return the existing queue job and record a `launch.idempotent-hit` audit event instead of creating duplicates.

Queue states are modeled as:

- `queued`
- `blocked`
- `approved`
- `dispatched-ready`
- `cancelled`
- `completed`
- `failed`

Phase 5 intentionally sets `dispatchAdapter: "none"`. A job can be approved or blocked, but it cannot dispatch real Thor/helper work until Phase 6 adds a safe backend adapter.

## Approval policy

The central approval helper in `lib/sdf/approval-policy.ts` evaluates whether a launch can be queued or dispatched. It checks:

1. Explicit Rex approval is present for external work.
2. A launch packet was generated.
3. Blockers are absent or explicitly acknowledged.
4. PR/checkpoint expectations are present.
5. Live adapter readiness exists if dispatch is requested.

External-write style actions remain blocked because Phase 5 has no safe dispatch adapter. This is deliberate: approval alone is not enough to send messages, mutate GitHub, spawn real agents, or touch production.

## Phase 6 dispatch path

Phase 6 should add a backend-only dispatcher that consumes approved queue jobs and still preserves these constraints:

- require `approvalPolicy.canDispatchExternalWork === true`
- keep dry-run/review modes first
- audit every external side effect with target, adapter, request id, and result
- make external write permissions least-privilege and adapter-specific
- keep browser UI as a control/readiness surface, not a secret-bearing execution runtime
