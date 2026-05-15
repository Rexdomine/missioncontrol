import "server-only";

import { createHash } from "crypto";
import { buildTaskPacket } from "./factory";
import { getGitHubLiveReadiness } from "./github";
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
      id: "live-adapter",
      label: "Live adapter configured before dispatch",
      passed: !options.dispatchRequested || (liveReadiness.configured && dispatchAdapterReady),
      detail: options.dispatchRequested
        ? "Dispatch requires a future safe backend adapter plus server-only credentials. Phase 5 intentionally does not dispatch."
        : liveReadiness.configured
          ? "Read-only GitHub sync is configured; write/dispatch adapter is still disabled."
          : liveReadiness.blocker,
    },
  ];

  const reasons = requirements.filter((requirement) => !requirement.passed).map((requirement) => requirement.detail);
  const canQueue = launchPacketGenerated && prExpectationsPresent;
  const canDispatchExternalWork = rexApproved && blockersClear && liveReadiness.configured && dispatchAdapterReady;
  const readyForDispatch = canDispatchExternalWork;
  const state: ApprovalPolicyStatus["state"] = readyForDispatch
    ? "dispatch-ready"
    : rexApproved
      ? "approved"
      : canQueue
        ? "ready-for-approval"
        : "blocked";

  return { state, readyForDispatch, canQueue, canDispatchExternalWork, reasons, requirements };
}

export function chooseLaunchQueueState(policy: ApprovalPolicyStatus, approvalState: LaunchApprovalState): LaunchQueueState {
  if (approvalState === "rejected") return "cancelled";
  if (!policy.canQueue) return "blocked";
  if (policy.readyForDispatch) return "dispatched-ready";
  if (approvalState === "approved") return "approved";
  return policy.reasons.length ? "blocked" : "queued";
}
