import type { OpenClawSessionsBridgeReadiness } from "./types";

export const OPENCLAW_SESSIONS_BRIDGE_SCHEMA_VERSION = "mission-control.openclaw.sessions.review.v1" as const;

export const SDF_OPENCLAW_BRIDGE_ENV = {
  enabled: "SDF_OPENCLAW_BRIDGE_ENABLED",
  endpoint: "SDF_OPENCLAW_BRIDGE_ENDPOINT",
  token: "SDF_OPENCLAW_BRIDGE_TOKEN",
  contractVersion: "SDF_OPENCLAW_BRIDGE_CONTRACT_VERSION",
} as const;

export const DEFAULT_OPENCLAW_SESSIONS_ALLOWLIST: OpenClawSessionsBridgeReadiness["allowlistedTargets"] = [
  {
    targetId: "thor-review-mission-control",
    agentId: "thor",
    operator: "Thor",
    repoPath: "/home/node/.openclaw/workspace/missioncontrol",
    mode: "review",
  },
];

export const OPENCLAW_SESSIONS_BRIDGE_REQUIRED_FIELDS = [
  "runId",
  "executionId",
  "handoffId",
  "idempotencyKey",
  "target.targetId",
  "target.agentId",
  "target.operator",
  "target.mode=review",
  "taskPacket",
  "allowlistedRepoPath",
  "approvalProof",
  "auditContext",
  "createdAt",
  "requestedBy",
] as const;

export const OPENCLAW_SESSIONS_BRIDGE_RESPONSE_FIELDS = [
  "accepted",
  "blocked",
  "sessionId",
  "jobId",
  "idempotencyStatus",
  "blockerReasons",
  "auditEventId",
  "nextAction",
] as const;
