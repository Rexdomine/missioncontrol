import "server-only";

import { createHash } from "crypto";
import { buildTaskPacket } from "./factory";
import { getGitHubLiveReadiness } from "./github";
import { getThorReviewAdapterReadiness } from "./thor-launch-adapter";
import type { ApprovalPolicyStatus, FactoryRun, LaunchApprovalState, LaunchQueueState } from "./types";

export function stableHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export function deriveLaunchIdempotencyKey(run: FactoryRun, approvalState: LaunchApprovalState, acknowledgedBlockers = false) {
  const packet = buildTaskPacket(run);
  return stableHash([
    run.id,
    stableHash(packet),
    approvalState,
    acknowledgedBlockers ? "blockers-acknowledged" : "blockers-open",
    run.prCheckpoint.branch,
    run.prCheckpoint.commit,
    run.prCheckpoint.prUrl,
  ].join("|"));
}

export function evaluateApprovalPolicy(run: FactoryRun, options: { approvalState?: LaunchApprovalState; acknowledgedBlockers?: boolean; dispatchRequested?: boolean } = {}): ApprovalPolicyStatus {
  const approvalState = options.approvalState ?? run.launchRequests[0]?.approvalState ?? "draft";
  const packet = buildTaskPacket(run);
  const readinessBlockers = run.readiness.filter((item) => !item.complete).map((item) => item.label);
  const checkpointBlockers = run.prCheckpoint.blockers ?? [];
  const blockers = [...readinessBlockers, ...checkpointBlockers].filter(Boolean);
  const blockersClear = blockers.length === 0 || Boolean(options.acknowledgedBlockers);
  const liveReadiness = getGitHubLiveReadiness(run.prCheckpoint.liveReadiness?.lastError ?? "");
  const prExpectationsPresent = Boolean(run.prCheckpoint.branch && run.prCheckpoint.commit && run.prCheckpoint.checkStatus);
  const launchPacketGenerated = packet.length > 120;
  const rexApproved = approvalState === "approved" || approvalState === "launched";
  const reviewAdapter = getThorReviewAdapterReadiness();
  const dispatchAdapterReady = false;

  const requirements = [
    {
      id: "rex-approval",
      label: "Explicit Rex approval recorded",
      passed: rexApproved,
      detail: rexApproved ? "Approval state is approved." : "Queueing may prepare work, but dispatch remains blocked until Rex approval is recorded.",
    },
    {
      id: "launch-packet",
      label: "Launch packet generated",
      passed: launchPacketGenerated,
      detail: launchPacketGenerated ? "Task packet is present and auditable." : "Generate a launch packet before queueing work.",
    },
    {
      id: "blockers",
      label: "Blockers absent or acknowledged",
      passed: blockersClear,
      detail: blockersClear ? "No unacknowledged blockers stop queueing." : blockers.join(" · "),
    },
    {
      id: "github-expectations",
      label: "PR/checkpoint expectations present",
      passed: prExpectationsPresent,
      detail: prExpectationsPresent ? `${run.prCheckpoint.branch} · ${run.prCheckpoint.commit} · ${run.prCheckpoint.checkStatus}` : "Branch, commit, and check expectations must be visible.",
    },
    {
      id: "thor-review-adapter",
      label: "Thor/helper review adapter available",
      passed: !options.dispatchRequested || reviewAdapter.enabled,
      detail: options.dispatchRequested
        ? reviewAdapter.blocker
        : "Phase 7 review-mode adapter can prepare an operator handoff only; it never spawns agents from the web app.",
    },
    {
      id: "external-write-adapters",
      label: "External write adapters remain disabled",
      passed: !options.dispatchRequested || !dispatchAdapterReady,
      detail: liveReadiness.configured
        ? "Read-only GitHub sync may be configured, but GitHub writes, notifications, and direct agent spawning remain disabled."
        : liveReadiness.blocker,
    },
  ];

  const reasons = requirements.filter((requirement) => !requirement.passed).map((requirement) => requirement.detail);
  const canQueue = launchPacketGenerated && prExpectationsPresent;
  const canPrepareReviewDispatch = canQueue && rexApproved && blockersClear && reviewAdapter.enabled;
  const canDispatchExternalWork = false;
  const readyForDispatch = canPrepareReviewDispatch;
  const state: ApprovalPolicyStatus["state"] = readyForDispatch
    ? "dispatch-ready"
    : rexApproved
      ? "approved"
      : canQueue
        ? "ready-for-approval"
        : "blocked";

  return { state, readyForDispatch, canQueue, canPrepareReviewDispatch, canDispatchExternalWork, reasons, requirements };
}

export function chooseLaunchQueueState(policy: ApprovalPolicyStatus, approvalState: LaunchApprovalState): LaunchQueueState {
  if (approvalState === "rejected") return "cancelled";
  if (!policy.canQueue) return "blocked";
  if (policy.readyForDispatch) return "dispatched-ready";
  if (approvalState === "approved") return "approved";
  return policy.reasons.length ? "blocked" : "queued";
}
