import "server-only";

import { stableHash } from "./approval-policy";
import { buildTaskPacket, generateId, nowIso } from "./factory";
import type { DispatchAdapterCapability, DispatchAttempt, DispatchMode, DispatchPlan, DispatchPlanStep, FactoryRun, LaunchQueueJob } from "./types";

export const dispatchAdapters: DispatchAdapterCapability[] = [
  {
    kind: "thor-agent",
    label: "Thor/helper-agent launch adapter",
    status: "blocked",
    readOnly: false,
    writeEnabled: false,
    requiresApproval: true,
    supportsDryRun: true,
    blocker: "Phase 6 only prepares reviewed dispatch plans. Live agent spawning is disabled until Phase 7 wiring and explicit Rex approval.",
  },
  {
    kind: "github-write",
    label: "GitHub write/comment/status adapter",
    status: "blocked",
    readOnly: false,
    writeEnabled: false,
    requiresApproval: true,
    supportsDryRun: true,
    blocker: "GitHub write scopes are intentionally not configured. Phase 6 may describe comments/statuses but never mutates GitHub.",
  },
  {
    kind: "notification",
    label: "Notification adapter",
    status: "blocked",
    readOnly: false,
    writeEnabled: false,
    requiresApproval: true,
    supportsDryRun: true,
    blocker: "Outbound messages are disabled for SDF dispatch until a least-privilege Phase 7 notification adapter is approved.",
  },
];

export function getDispatcherReadiness() {
  return {
    status: "review-only" as const,
    defaultMode: "dry-run" as const,
    liveExecutionEnabled: false,
    summary: "Dispatcher is available for backend-only dry-run/review planning. All live external-write adapters are disabled.",
    adapters: dispatchAdapters,
  };
}

function planSteps(run: FactoryRun, job: LaunchQueueJob): DispatchPlanStep[] {
  return [
    {
      id: "prepare-agent-packet",
      adapter: "thor-agent",
      action: "Prepare Thor/helper-agent launch packet from approved SDF queue job.",
      dryRunOnly: true,
      externalWrite: false,
      approvalRequired: true,
      status: job.approvalPolicy.readyForDispatch || job.approvalState === "approved" ? "ready" : "blocked",
      detail: job.approvalState === "approved" ? "Packet can be reviewed in dry-run mode; no agent process is spawned." : "Rex approval must be recorded before dry-run dispatch planning is approved.",
    },
    {
      id: "review-github-handoff",
      adapter: "github-write",
      action: `Review intended GitHub handoff for ${run.prCheckpoint.branch || "pending branch"} without comments, statuses, pushes, or workflow dispatches.`,
      dryRunOnly: true,
      externalWrite: false,
      approvalRequired: true,
      status: "blocked",
      detail: "Write adapter disabled. Phase 6 can show intended PR/status handoff only.",
    },
    {
      id: "review-notification",
      adapter: "notification",
      action: "Review notification copy that would be sent after live dispatch in a later phase.",
      dryRunOnly: true,
      externalWrite: false,
      approvalRequired: true,
      status: "blocked",
      detail: "Outbound notification adapter disabled. No messages are sent.",
    },
  ];
}

export function findDispatchableJob(run: FactoryRun, requestedJobId?: string) {
  const jobs = run.launchQueue ?? [];
  if (requestedJobId) return jobs.find((job) => job.id === requestedJobId) ?? null;
  return jobs.find((job) => job.state === "approved" || job.state === "dispatched-ready") ?? jobs[0] ?? null;
}

export function buildDispatchPlan(run: FactoryRun, job: LaunchQueueJob, mode: DispatchMode = "dry-run"): DispatchPlan {
  const packetHash = stableHash(buildTaskPacket(run));
  const liveExecutionBlocked = true;
  const policyReasons = job.approvalPolicy.reasons ?? [];
  const approvedForDryRun = mode !== "live" && job.approvalState === "approved" && job.approvalPolicy.canQueue;
  const adapterBlockers = dispatchAdapters.filter((adapter) => !adapter.writeEnabled).map((adapter) => adapter.blocker);
  const blockerReasons = [
    ...(job.approvalState === "approved" ? [] : ["Rex approval must be recorded before dispatch review can be approved."]),
    ...(job.approvalPolicy.canQueue ? [] : policyReasons),
    ...(mode === "live" ? ["Live dispatch is disabled in Phase 6. Use dry-run/review mode only.", ...adapterBlockers] : adapterBlockers),
  ].filter(Boolean);
  const idempotencyKey = stableHash([run.id, job.id, job.idempotencyKey, packetHash, mode, "phase6-dispatch-review-v1"].join("|"));

  return {
    id: `dispatch-plan-${idempotencyKey}`,
    runId: run.id,
    jobId: job.id,
    mode,
    idempotencyKey,
    createdAt: nowIso(),
    approvedForDryRun,
    liveExecutionBlocked,
    summary: approvedForDryRun
      ? "Approved queue job is ready for Phase 6 dry-run dispatch review. No external side effects will occur."
      : "Dispatch review is blocked until approval/policy requirements are satisfied; live execution remains disabled.",
    blockerReasons,
    adapters: dispatchAdapters,
    steps: planSteps(run, job),
  };
}

export function createDispatchAttempt(run: FactoryRun, job: LaunchQueueJob, mode: DispatchMode, requestedBy: DispatchAttempt["requestedBy"] = "System"): DispatchAttempt {
  const plan = buildDispatchPlan(run, job, mode);
  const outcome = mode === "live" || !plan.approvedForDryRun ? "blocked" : "planned";
  const timestamp = nowIso();
  return {
    id: generateId("dispatch-attempt"),
    runId: run.id,
    jobId: job.id,
    mode,
    idempotencyKey: plan.idempotencyKey,
    outcome,
    plan,
    requestedBy,
    createdAt: timestamp,
    updatedAt: timestamp,
    note: outcome === "planned"
      ? "Dry-run dispatch plan recorded. No external agents, GitHub writes, messages, or production mutations were performed."
      : "Dispatch blocked by Phase 6 review/live-adapter safety policy. No external side effects occurred.",
  };
}
