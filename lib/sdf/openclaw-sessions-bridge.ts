import "server-only";

import { stableHash } from "./approval-policy";
import { DEFAULT_OPENCLAW_SESSIONS_ALLOWLIST, OPENCLAW_SESSIONS_BRIDGE_SCHEMA_VERSION, SDF_OPENCLAW_BRIDGE_ENV } from "./openclaw-sessions-contract";
import type { OpenClawSessionsBridgeReadiness, OpenClawSessionsBridgeRequest } from "./types";

function isTruthy(value: string | undefined) {
  return value === "true";
}

export function getOpenClawSessionsBridgeReadiness(): OpenClawSessionsBridgeReadiness {
  const enabled = isTruthy(process.env[SDF_OPENCLAW_BRIDGE_ENV.enabled]);
  const endpointConfigured = Boolean(process.env[SDF_OPENCLAW_BRIDGE_ENV.endpoint]);
  const tokenConfigured = Boolean(process.env[SDF_OPENCLAW_BRIDGE_ENV.token]);
  const contractVersionConfigured = process.env[SDF_OPENCLAW_BRIDGE_ENV.contractVersion] === OPENCLAW_SESSIONS_BRIDGE_SCHEMA_VERSION;
  const configReady = enabled && endpointConfigured && tokenConfigured && contractVersionConfigured;
  const blockers = [
    ...(enabled ? [] : [`${SDF_OPENCLAW_BRIDGE_ENV.enabled}=true is not configured; live OpenClaw session submission is disabled by default.`]),
    ...(endpointConfigured ? [] : [`${SDF_OPENCLAW_BRIDGE_ENV.endpoint} is not configured for a server-only OpenClaw sessions endpoint.`]),
    ...(tokenConfigured ? [] : [`${SDF_OPENCLAW_BRIDGE_ENV.token} is not configured in the server environment.`]),
    ...(contractVersionConfigured ? [] : [`${SDF_OPENCLAW_BRIDGE_ENV.contractVersion} must equal ${OPENCLAW_SESSIONS_BRIDGE_SCHEMA_VERSION}.`]),
    "Phase 10 intentionally does not include a live OpenClaw sessions API client; dry-run submission and audit are available only.",
  ];

  return {
    bridge: "openclaw-sessions-review-bridge",
    status: !enabled ? "disabled" : configReady ? "adapter-unavailable" : "missing-config",
    enabled,
    endpointConfigured,
    tokenConfigured,
    contractVersionConfigured,
    liveSubmissionReady: false,
    dryRunAvailable: true,
    reviewModeOnly: true,
    allowlistedTargets: DEFAULT_OPENCLAW_SESSIONS_ALLOWLIST,
    summary: configReady
      ? "OpenClaw sessions bridge config is present, but Phase 10 has no approved live sessions API client. Only dry-run, idempotent, audit-visible submission is enabled."
      : "OpenClaw sessions bridge is disabled by default. Configure server-only env and approve the sessions API client before live review-mode submission.",
    blockers,
    requiredEnv: Object.values(SDF_OPENCLAW_BRIDGE_ENV),
  };
}

export function buildOpenClawSessionSubmissionIdempotencyKey(values: { executionId: string; handoffId: string; requestedKey: string; action: string }) {
  return stableHash(["phase10-openclaw-sessions-bridge-submission-v1", values.executionId, values.handoffId, values.requestedKey, values.action].join("|"));
}

export function validateOpenClawSessionsBridgeRequest(request: OpenClawSessionsBridgeRequest, readiness = getOpenClawSessionsBridgeReadiness()) {
  const matchedTarget = readiness.allowlistedTargets.find((target) => {
    const requestedPath = request.allowlistedRepoPath;
    const pathAllowed = requestedPath === target.repoPath || requestedPath.startsWith(`${target.repoPath}/`);
    return target.targetId === request.target.targetId
      && target.agentId === request.target.agentId
      && target.operator === request.target.operator
      && target.mode === request.target.mode
      && pathAllowed;
  });

  const blockers = [
    ...(request.schemaVersion === OPENCLAW_SESSIONS_BRIDGE_SCHEMA_VERSION ? [] : [`schemaVersion must be ${OPENCLAW_SESSIONS_BRIDGE_SCHEMA_VERSION}.`]),
    ...(request.target.mode === "review" ? [] : ["Only mode=review is permitted for the Phase 10 bridge."]),
    ...(request.approvalProof.approvalIntent === "rex-approved-review-dispatch" ? [] : ["approvalProof.approvalIntent must be rex-approved-review-dispatch."]),
    ...(request.taskPacket.reviewModeOnly === true && request.taskPacket.externalSideEffectsAllowed === false ? [] : ["taskPacket must be review-mode only with external side effects disabled."]),
    ...(matchedTarget ? [] : ["Target agent/operator/repo path is outside the Phase 10 allowlist."]),
  ];

  return { allowed: blockers.length === 0, blockers, matchedTarget };
}
