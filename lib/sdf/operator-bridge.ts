import "server-only";

import { stableHash } from "./approval-policy";
import { buildTaskPacket, nowIso } from "./factory";
import type { DispatchAttempt, FactoryRun, LaunchQueueJob, OperatorBridgeOutboxItem, OperatorBridgeState, OperatorExecutionPacket } from "./types";

const DISABLED_ACTIONS = [
  "No GitHub comments, status updates, pushes, merges, or workflow dispatches from Mission Control.",
  "No Telegram, email, Slack, webhook, or notification sends from Mission Control.",
  "No production writes, deploys, shell commands, or direct OpenClaw/agent spawning from the web app.",
  "Operator execution happens outside the app and must report branch, commit, PR, verification, and blockers back for audit.",
];

export function buildOperatorBridgeIdempotencyKey(run: FactoryRun, job: LaunchQueueJob) {
  return stableHash([
    "phase8-openclaw-operator-bridge-v1",
    run.id,
    job.id,
    job.idempotencyKey,
    job.packetHash,
    job.approvalState,
  ].join("|"));
}

export function buildOperatorExecutionPacket(run: FactoryRun, job: LaunchQueueJob, values: { handoffId: string; idempotencyKey: string; actor: OperatorBridgeOutboxItem["actor"]; dispatchAttempt?: DispatchAttempt; approvalNote?: string }): OperatorExecutionPacket {
  const taskPacket = buildTaskPacket(run);
  return {
    schemaVersion: "mission-control.sdf.operator-packet.v1",
    packetType: "openclaw-review-mode-handoff",
    reviewModeOnly: true,
    externalSideEffectsAllowed: false,
    handoffId: values.handoffId,
    runId: run.id,
    runTitle: run.title,
    queueJobId: job.id,
    dispatchAttemptId: values.dispatchAttempt?.id,
    idempotencyKey: values.idempotencyKey,
    packetHash: stableHash(taskPacket),
    approvalIntent: "rex-approved-review-dispatch",
    operatorInstructions: [
      "Copy this packet into a separate StarLord/Thor OpenClaw operator flow.",
      "Run in review mode only unless Rex separately approves a later live bridge phase.",
      "Implement or review from the packet outside Mission Control; the web app is only the auditable outbox.",
      "Record the resulting state through claim/start/complete/block/cancel/fail so Rex can see the lifecycle.",
    ],
    disabledActions: DISABLED_ACTIONS,
    taskPacket,
    audit: {
      preparedBy: values.actor,
      preparedAt: nowIso(),
      approvalNote: values.approvalNote ?? "Explicit Rex approval intent recorded for review-mode OpenClaw/operator handoff only.",
    },
  };
}

export function buildOperatorBridgeOutboxItem(run: FactoryRun, job: LaunchQueueJob, values: { actor: OperatorBridgeOutboxItem["actor"]; dispatchAttempt?: DispatchAttempt; approvalNote?: string }): OperatorBridgeOutboxItem {
  const idempotencyKey = buildOperatorBridgeIdempotencyKey(run, job);
  const handoffId = `openclaw-operator-handoff-${idempotencyKey}`;
  const blockedReasons = [
    ...(job.approvalState === "approved" ? [] : ["Explicit Rex approval must be stored before OpenClaw/operator bridge preparation."]),
    ...(job.approvalPolicy.canPrepareReviewDispatch ? [] : job.approvalPolicy.reasons),
  ].filter(Boolean);
  const timestamp = nowIso();
  const packet = buildOperatorExecutionPacket(run, job, { handoffId, idempotencyKey, actor: values.actor, dispatchAttempt: values.dispatchAttempt, approvalNote: values.approvalNote });

  return {
    id: `operator-bridge-${idempotencyKey}`,
    handoffId,
    runId: run.id,
    queueJobId: job.id,
    launchRequestId: job.launchRequestId,
    dispatchAttemptId: values.dispatchAttempt?.id,
    idempotencyKey,
    state: blockedReasons.length ? "blocked" : "prepared",
    actor: values.actor,
    packetHash: packet.packetHash,
    reviewModeOnly: true,
    externalExecution: false,
    approvalIntent: "rex-approved-review-dispatch",
    createdAt: timestamp,
    updatedAt: timestamp,
    blockedReasons,
    notes: [
      blockedReasons.length
        ? "Bridge item is blocked; no operator should claim it until requirements pass."
        : "Prepared for StarLord/Thor operator claim in review mode only. Mission Control performed no external side effects.",
    ],
    auditMetadata: {
      phase: "8",
      reviewModeOnly: true,
      externalSideEffectsAllowed: false,
      liveBridgeAvailable: false,
    },
    executionPacket: packet,
  };
}

export function transitionOperatorBridgeItem(item: OperatorBridgeOutboxItem, values: { action: "claim" | "start-review" | "complete-review" | "block" | "cancel" | "fail"; actor: OperatorBridgeOutboxItem["actor"]; operator?: string; note?: string; blockedReason?: string }): OperatorBridgeOutboxItem {
  const timestamp = nowIso();
  const transitionState: Record<typeof values.action, OperatorBridgeState> = {
    claim: "claimed",
    "start-review": "review-running",
    "complete-review": "review-completed",
    block: "blocked",
    cancel: "cancelled",
    fail: "failed",
  };
  const nextState = transitionState[values.action];
  const note = values.note || `Operator bridge ${values.action} recorded by ${values.actor}. No external side effect was performed by Mission Control.`;
  return {
    ...item,
    state: nextState,
    actor: values.actor,
    operator: values.operator ?? item.operator,
    updatedAt: timestamp,
    claimedAt: values.action === "claim" ? timestamp : item.claimedAt,
    completedAt: values.action === "complete-review" ? timestamp : item.completedAt,
    blockedReasons: values.action === "block" && values.blockedReason ? [values.blockedReason, ...item.blockedReasons] : item.blockedReasons,
    notes: [note, ...item.notes],
    auditMetadata: {
      ...item.auditMetadata,
      lastAction: values.action,
      lastActor: values.actor,
      externalSideEffectsAllowed: false,
    },
  };
}
