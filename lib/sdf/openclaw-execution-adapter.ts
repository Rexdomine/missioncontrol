import "server-only";

import { stableHash } from "./approval-policy";
import { generateId, nowIso } from "./factory";
import type { OperatorExecutionAction, OperatorExecutionRecord, OperatorExecutionState, OperatorBridgeOutboxItem } from "./types";

const DIRECT_EXECUTION_ENV = "SDF_OPENCLAW_DIRECT_EXECUTION_ENABLED";

export function isOpenClawDirectExecutionEnabled() {
  return process.env[DIRECT_EXECUTION_ENV] === "true";
}

export function getOpenClawExecutionAdapterReadiness() {
  const directRequested = isOpenClawDirectExecutionEnabled();
  return {
    adapter: "openclaw-review-queue" as const,
    status: "review-queue-only" as const,
    reviewModeOnly: true as const,
    directExecutionEnabled: false as const,
    liveExecutionBlocked: true as const,
    directRequested,
    summary: directRequested
      ? `${DIRECT_EXECUTION_ENV}=true was requested, but Mission Control has no secure in-app OpenClaw sessions API. Phase 9 still queues copyable review-mode operator packets only.`
      : "Phase 9 queues copyable OpenClaw/operator review-mode execution records only. Mission Control does not spawn agents, run shell commands, write GitHub, notify anyone, or mutate production.",
    blockers: [
      "No secure in-app OpenClaw sessions API is configured for Mission Control.",
      "Direct agent spawning, shell execution, GitHub writes, notifications, and production writes remain disabled from the web app.",
    ],
  };
}

export function buildOperatorExecutionIdempotencyKey(item: OperatorBridgeOutboxItem) {
  return stableHash([
    "phase9-openclaw-review-execution-record-v1",
    item.runId,
    item.id,
    item.handoffId,
    item.queueJobId,
    item.idempotencyKey,
    item.packetHash,
  ].join("|"));
}

function buildCopyableCommand(item: OperatorBridgeOutboxItem) {
  const payload = JSON.stringify(item.executionPacket, null, 2);
  return [
    "# Review-mode only: paste this packet into StarLord/Thor outside Mission Control.",
    "# Mission Control must not run shell commands, spawn agents, write GitHub, notify anyone, or mutate production.",
    "cat <<'MISSION_CONTROL_SDF_OPERATOR_PACKET'",
    payload,
    "MISSION_CONTROL_SDF_OPERATOR_PACKET",
  ].join("\n");
}

export function buildOperatorExecutionRecord(item: OperatorBridgeOutboxItem, values: { actor: OperatorExecutionRecord["events"][number]["actor"]; operatorTarget?: string; resultSummary?: string }): OperatorExecutionRecord {
  const timestamp = nowIso();
  const idempotencyKey = buildOperatorExecutionIdempotencyKey(item);
  const readiness = getOpenClawExecutionAdapterReadiness();
  const blockedReasons = [
    ...(item.state === "prepared" || item.state === "claimed" || item.state === "review-running" ? [] : [`Bridge item must be prepared, claimed, or review-running before execution queueing. Current state: ${item.state}.`]),
    ...(item.reviewModeOnly ? [] : ["Bridge item is not marked review-mode only."]),
    ...(item.externalExecution === false ? [] : ["Bridge item unexpectedly allows external execution."]),
    ...(item.blockedReasons ?? []),
  ];
  const state: OperatorExecutionState = blockedReasons.length ? "blocked" : "queued-for-operator";

  return {
    id: `operator-execution-${idempotencyKey}`,
    bridgeItemId: item.id,
    handoffId: item.handoffId,
    runId: item.runId,
    runTitle: item.executionPacket.runTitle,
    queueJobId: item.queueJobId,
    launchRequestId: item.launchRequestId,
    dispatchAttemptId: item.dispatchAttemptId,
    idempotencyKey,
    state,
    operatorTarget: values.operatorTarget ?? item.operator ?? "StarLord/Thor operator",
    adapter: "openclaw-review-queue",
    reviewModeOnly: true,
    directExecutionEnabled: false,
    liveExecutionBlocked: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    executionPacketSnapshot: item.executionPacket,
    copyableCommand: buildCopyableCommand(item),
    resultSummary: values.resultSummary,
    blockedReasons: state === "blocked" ? blockedReasons : readiness.blockers,
    auditMetadata: {
      phase: "9",
      bridgeItemId: item.id,
      handoffId: item.handoffId,
      directRequested: readiness.directRequested,
      directExecutionEnabled: false,
      liveExecutionBlocked: true,
      externalSideEffectsAllowed: false,
    },
    submissionAttempts: [],
    events: [
      {
        id: generateId("operator-execution-event"),
        action: "queue",
        actor: values.actor,
        at: timestamp,
        summary: state === "blocked"
          ? "Execution record was blocked before operator queueing. No external side effects occurred."
          : "Review-mode operator execution record queued. Mission Control produced a copyable packet only and performed no external side effects.",
      },
    ],
  };
}

export function transitionOperatorExecutionRecord(record: OperatorExecutionRecord, values: { action: Exclude<OperatorExecutionAction, "queue">; actor: OperatorExecutionRecord["events"][number]["actor"]; operatorTarget?: string; resultSummary?: string; blockedReason?: string }): OperatorExecutionRecord {
  const timestamp = nowIso();
  const stateMap: Record<Exclude<OperatorExecutionAction, "queue">, OperatorExecutionState> = {
    "start-review": "running-review",
    "complete-review": "completed-review",
    block: "blocked",
    cancel: "cancelled",
    fail: "failed",
  };
  const nextState = stateMap[values.action];
  const summary = values.resultSummary
    ?? (values.action === "start-review"
      ? "Operator marked review-mode execution as running outside Mission Control."
      : values.action === "complete-review"
        ? "Operator marked review-mode execution as completed; review results should be captured in the result summary."
        : `Operator marked review-mode execution ${nextState}.`);

  return {
    ...record,
    state: nextState,
    operatorTarget: values.operatorTarget ?? record.operatorTarget,
    updatedAt: timestamp,
    startedAt: values.action === "start-review" ? timestamp : record.startedAt,
    completedAt: values.action === "complete-review" ? timestamp : record.completedAt,
    resultSummary: values.resultSummary ?? record.resultSummary,
    blockedReasons: values.action === "block" && values.blockedReason ? [values.blockedReason, ...record.blockedReasons] : record.blockedReasons,
    auditMetadata: {
      ...record.auditMetadata,
      lastAction: values.action,
      lastActor: values.actor,
      directExecutionEnabled: false,
      liveExecutionBlocked: true,
      externalSideEffectsAllowed: false,
    },
    events: [
      {
        id: generateId("operator-execution-event"),
        action: values.action,
        actor: values.actor,
        at: timestamp,
        summary: `${summary} Mission Control performed no shell commands, agent spawning, GitHub writes, notifications, or production writes.`,
      },
      ...record.events,
    ],
  };
}
