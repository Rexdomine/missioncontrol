import "server-only";

import { stableHash } from "./approval-policy";
import { buildTaskPacket, generateId, nowIso } from "./factory";
import { buildThorReviewHandoffIdempotencyKey, getThorReviewAdapterReadiness, prepareThorReviewHandoff } from "./thor-launch-adapter";
import type { DispatchAdapterCapability, DispatchAttempt, DispatchMode, DispatchPlan, DispatchPlanStep, FactoryRun, LaunchQueueJob, ThorReviewHandoff } from "./types";

export const dispatchAdapters: DispatchAdapterCapability[] = [
  {
    kind: "thor-agent",
    label: "Thor/helper-agent review-mode handoff adapter",
    status: getThorReviewAdapterReadiness().status,
    readOnly: false,
    writeEnabled: false,
    requiresApproval: true,
    supportsDryRun: true,
    blocker: getThorReviewAdapterReadiness().blocker,
  },
  {
    kind: "github-write",
    label: "GitHub write/comment/status adapter",
    status: "blocked",
    readOnly: false,
    writeEnabled: false,
    requiresApproval: true,
    supportsDryRun: true,
    blocker: "GitHub write scopes are intentionally not configured. Phase 7 may prepare a Thor/helper handoff only; it never mutates GitHub.",
  },
  {
    kind: "notification",
    label: "Notification adapter",
    status: "blocked",
    readOnly: false,
    writeEnabled: false,
    requiresApproval: true,
    supportsDryRun: true,
    blocker: "Outbound messages are disabled for SDF dispatch. Phase 7 does not send Telegram, email, Slack, or webhook notifications.",
  },
];

export function getDispatcherReadiness() {
  return {
    status: "review-only" as const,
    defaultMode: "review-dispatch" as const,
    liveExecutionEnabled: false,
    summary: "Phase 7 can prepare approved Thor/helper review-mode operator handoffs. No GitHub writes, notifications, production writes, or direct agent spawning are enabled.",
    adapters: dispatchAdapters,
  };
}

function isReviewDispatchMode(mode: DispatchMode) {
  return mode === "review-dispatch" || mode === "operator-handoff";
}

function planSteps(run: FactoryRun, job: LaunchQueueJob, mode: DispatchMode): DispatchPlanStep[] {
  const reviewDispatch = isReviewDispatchMode(mode);
  return [
    {
      id: "prepare-agent-packet",
      adapter: "thor-agent",
      action: reviewDispatch
        ? "Prepare Thor/helper-agent review-mode operator handoff packet from approved SDF queue job."
        : "Preview Thor/helper-agent launch packet from approved SDF queue job.",
      dryRunOnly: !reviewDispatch,
      externalWrite: false,
      approvalRequired: true,
      status: job.approvalPolicy.canPrepareReviewDispatch ? "ready" : "blocked",
      detail: job.approvalState === "approved"
        ? "Packet can be prepared for StarLord/Thor operator execution in review mode; the web app does not spawn an agent."
        : "Rex approval must be recorded before review dispatch preparation is allowed.",
    },
    {
      id: "review-github-handoff",
      adapter: "github-write",
      action: `Show intended GitHub handoff for ${run.prCheckpoint.branch || "pending branch"} without comments, statuses, pushes, or workflow dispatches.`,
      dryRunOnly: true,
      externalWrite: false,
      approvalRequired: true,
      status: "blocked",
      detail: "Write adapter disabled. Phase 7 only records operator handoff context; GitHub mutation is out of scope.",
    },
    {
      id: "review-notification",
      adapter: "notification",
      action: "Show the future notification boundary without sending any outbound message.",
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
  return jobs.find((job) => job.state === "dispatched-ready" || job.state === "approved") ?? jobs[0] ?? null;
}

export function buildDispatchPlan(run: FactoryRun, job: LaunchQueueJob, mode: DispatchMode = "dry-run"): DispatchPlan {
  const packetHash = stableHash(buildTaskPacket(run));
  const liveExecutionBlocked = true;
  const policyReasons = job.approvalPolicy.reasons ?? [];
  const reviewDispatch = isReviewDispatchMode(mode);
  const approvedForDryRun = mode !== "live" && job.approvalState === "approved" && job.approvalPolicy.canQueue;
  const adapterBlockers = dispatchAdapters.filter((adapter) => adapter.kind !== "thor-agent" && !adapter.writeEnabled).map((adapter) => adapter.blocker);
  const reviewAdapterBlockers = job.approvalPolicy.canPrepareReviewDispatch ? [] : policyReasons;
  const blockerReasons = [
    ...(job.approvalState === "approved" ? [] : ["Explicit Rex approval must be stored before review dispatch can be prepared."]),
    ...(job.approvalPolicy.canQueue ? [] : policyReasons),
    ...(reviewDispatch ? reviewAdapterBlockers : []),
    ...(mode === "live" ? ["Live dispatch is disabled in Phase 7. Use review-dispatch/operator-handoff mode only."] : []),
    ...adapterBlockers,
  ].filter(Boolean);
  const idempotencyKey = reviewDispatch
    ? buildThorReviewHandoffIdempotencyKey(run, job)
    : stableHash([run.id, job.id, job.idempotencyKey, packetHash, mode, "phase7-dispatch-review-v1"].join("|"));

  return {
    id: `dispatch-plan-${idempotencyKey}`,
    runId: run.id,
    jobId: job.id,
    mode,
    idempotencyKey,
    createdAt: nowIso(),
    approvedForDryRun,
    liveExecutionBlocked,
    summary: reviewDispatch && job.approvalPolicy.canPrepareReviewDispatch
      ? "Approved queue job can be prepared as a Phase 7 Thor/helper review-mode operator handoff. No external side effects will occur."
      : approvedForDryRun
        ? "Approved queue job is ready for dry-run dispatch review. No external side effects will occur."
        : "Dispatch review is blocked until approval/policy requirements are satisfied; live execution remains disabled.",
    blockerReasons,
    adapters: dispatchAdapters,
    steps: planSteps(run, job, mode),
  };
}

export function createDispatchAttempt(run: FactoryRun, job: LaunchQueueJob, mode: DispatchMode, requestedBy: DispatchAttempt["requestedBy"] = "System", handoff?: ThorReviewHandoff): DispatchAttempt {
  const plan = buildDispatchPlan(run, job, mode);
  const reviewDispatch = isReviewDispatchMode(mode);
  const outcome = mode === "live" || (!reviewDispatch && !plan.approvedForDryRun) || (reviewDispatch && handoff?.state === "blocked")
    ? "blocked"
    : reviewDispatch
      ? "prepared"
      : "planned";
  const timestamp = nowIso();
  return {
    id: generateId("dispatch-attempt"),
    runId: run.id,
    jobId: job.id,
    mode,
    idempotencyKey: plan.idempotencyKey,
    outcome,
    plan,
    reviewHandoff: handoff,
    requestedBy,
    createdAt: timestamp,
    updatedAt: timestamp,
    note: outcome === "prepared"
      ? "Thor/helper review-mode handoff prepared for StarLord/Thor operator execution. The web app did not spawn agents, write GitHub, send messages, or mutate production."
      : outcome === "planned"
        ? "Dry-run dispatch plan recorded. No external agents, GitHub writes, messages, or production mutations were performed."
        : "Dispatch blocked by Phase 7 review/live-adapter safety policy. No external side effects occurred.",
  };
}

export function createThorReviewHandoff(run: FactoryRun, job: LaunchQueueJob) {
  return prepareThorReviewHandoff(run, job);
}
