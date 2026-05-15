# SDF Phase 4 Integration Foundations

Phase 4 moves the Software Development Factory from browser-local controls toward production-grade server integration boundaries.

## What is live in this slice

- `/api/sdf/runs` lists and creates typed factory runs.
- `/api/sdf/runs/[id]` reads and updates a run state/intake.
- `/api/sdf/runs/[id]/sync` records GitHub checkpoint status from a `manual`, `simulated`, or future `live` source.
- `/api/sdf/runs/[id]/launch-requests` prepares Thor/helper launch packets and records Rex approval/request state.
- `/sdf` uses the API registry as the primary source of truth and keeps `localStorage` only as a resilience fallback if the API cannot load.
- Each persistence action, checkpoint sync, launch request, and approval state change writes a non-secret audit event.

## Local persistence adapter

No database is configured in this repo yet, so Phase 4 uses a safe file-backed development adapter:

- Default path: `.mission-control-data/sdf/runs.json`
- Override path: set `SDF_DATA_DIR=/absolute/path/to/sdf-data`
- `.mission-control-data/` is ignored and must not be committed.

This adapter is intentionally small and swappable. A future database adapter should preserve the `FactoryRun`, `LaunchRequest`, and `SdfAuditEvent` contracts in `lib/sdf/types.ts` and keep route behavior stable.

## GitHub checkpoint sync boundary

The UI shows:

- sync source: `live`, `manual`, or `simulated`
- last checked timestamp
- branch
- commit
- PR URL
- check state
- review state
- blockers
- next action

Live sync is deliberately not assumed. The `/sync` route only marks a source as `live` when these server-side environment variables exist:

- `GITHUB_TOKEN`
- `GITHUB_REPOSITORY` (for example `Rexdomine/missioncontrol`)

Without those, a requested live sync is downgraded to manual and records a blocker. Phase 4 does not mutate GitHub.

## Gated launch workflow

The launch workflow prepares a Thor/helper packet and records approval state. It does **not** spawn agents, send messages, push branches, open PRs, or trigger other external side effects.

Approval states are modeled as:

- `draft`
- `requested`
- `approved`
- `rejected`
- `launched` (reserved for a future safe backend adapter)

Phase 5 should connect a real orchestration backend only after:

1. Rex approval policy is explicit.
2. The backend can authenticate safely without exposing secrets to the browser.
3. Launch requests are idempotent and auditable.
4. External writes have dry-run/review modes and clear rollback expectations.

## Phase 5 recommendation

Add a server-only orchestration adapter with separate capabilities for:

- GitHub read-only PR/check status sync.
- GitHub write actions only after Rex approval.
- Agent launch request queueing with idempotency keys.
- Audit export/search so Rex can review what happened before trusting automation.
