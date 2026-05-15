import "server-only";

import { createHash } from "crypto";
import { buildTaskPacket, nowIso } from "./factory";
import type { FactoryRun, LaunchQueueJob, ThorReviewHandoff } from "./types";

const REVIEW_ADAPTER_ENV = "SDF_THOR_REVIEW_ADAPTER_ENABLED";

function stableHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export function isThorReviewAdapterEnabled() {
  return process.env[REVIEW_ADAPTER_ENV] !== "false";
}

export function getThorReviewAdapterReadiness() {
  const enabled = isThorReviewAdapterEnabled();
  return {
    enabled,
    status: enabled ? "configured" as const : "blocked" as const,
    blocker: enabled
      ? "Review-mode prepared handoff is available. It records operator packets only and never spawns agents from the web app."
      : `${REVIEW_ADAPTER_ENV}=false disables even prepared Thor/helper handoff packets.`,
  };
}

export function buildThorReviewHandoffIdempotencyKey(run: FactoryRun, job: LaunchQueueJob) {
  return stableHash([
    "phase7-thor-review-handoff-v1",
    run.id,
    job.id,
    job.idempotencyKey,
    job.packetHash,
    job.approvalState,
  ].join("|"));
}

export function prepareThorReviewHandoff(run: FactoryRun, job: LaunchQueueJob): ThorReviewHandoff {
  const idempotencyKey = buildThorReviewHandoffIdempotencyKey(run, job);
  const packet = buildTaskPacket(run);
  const readiness = getThorReviewAdapterReadiness();
  const blockerReasons = [
    ...(job.approvalState === "approved" ? [] : ["Explicit Rex approval must be stored before review dispatch can be prepared."]),
    ...(job.approvalPolicy.canPrepareReviewDispatch ? [] : job.approvalPolicy.reasons),
    ...(readiness.enabled ? [] : [readiness.blocker]),
  ].filter(Boolean);

  return {
    id: `thor-review-handoff-${idempotencyKey}`,
    runId: run.id,
    jobId: job.id,
    idempotencyKey,
    state: blockerReasons.length ? "blocked" : "waiting-for-operator",
    adapter: "thor-helper-review",
    reviewModeOnly: true,
    externalExecution: false,
    preparedAt: nowIso(),
    packet,
    packetHash: stableHash(packet),
    approvalIntent: "rex-approved-review-dispatch",
    operatorNextAction: blockerReasons.length
      ? "Resolve blockers, record explicit Rex review-dispatch approval, then prepare the handoff again."
      : "StarLord/Thor operator copies this packet into a separate Thor/helper-agent session in review mode, then records the resulting branch, commit, verification, PR, and blockers back in Mission Control.",
    blockerReasons,
  };
}
