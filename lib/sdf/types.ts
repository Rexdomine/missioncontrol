export type FactoryModeName = "Assisted" | "Factory" | "Autopilot";

export type BuildIntake = {
  appName: string;
  productGoal: string;
  mode: FactoryModeName;
  appType: string;
  repoDetails: string;
  designAssets: string;
  requiredFeatures: string;
  constraints: string;
  rexProvides: string;
};

export type FactoryRunState = "Draft" | "Ready to launch" | "Running" | "Blocked" | "Review ready" | "PR open" | "Done";
export type GeneratedTaskStatus = "Ready" | "Input needed" | "Queued" | "Gate pending" | "Running" | "Done";
export type TimelineStatus = "Planned" | "Active" | "Blocked" | "Complete" | "Review";
export type CheckStatus = "Simulated" | "Pending" | "Passing" | "Failing" | "Not connected";
export type ReviewState = "Not requested" | "Needs Rex" | "Changes requested" | "Approved";
export type SyncSource = "live" | "manual" | "simulated";
export type LaunchApprovalState = "draft" | "requested" | "approved" | "rejected" | "launched";
export type LaunchQueueState = "queued" | "blocked" | "approved" | "dispatched-ready" | "cancelled" | "completed" | "failed";
export type LiveAdapterStatus = "configured" | "not-configured" | "blocked";
export type DispatchMode = "dry-run" | "review" | "review-dispatch" | "operator-handoff" | "live";
export type DispatchOutcome = "planned" | "prepared" | "blocked" | "idempotent-hit";
export type DispatchAdapterKind = "thor-agent" | "github-write" | "notification";
export type OperatorBridgeState = "prepared" | "claimed" | "review-running" | "review-completed" | "blocked" | "cancelled" | "failed";
export type OperatorBridgeAction = "prepare" | "claim" | "start-review" | "complete-review" | "block" | "cancel" | "fail";
export type OperatorExecutionState = "pending-review" | "queued-for-operator" | "running-review" | "completed-review" | "blocked" | "cancelled" | "failed";
export type OperatorExecutionAction = "queue" | "start-review" | "complete-review" | "block" | "cancel" | "fail";
export type AuditAction =
  | "run.created"
  | "run.updated"
  | "sync.requested"
  | "sync.updated"
  | "launch.prepared"
  | "launch.queued"
  | "launch.idempotent-hit"
  | "approval.changed"
  | "approval.policy.evaluated"
  | "dispatch.previewed"
  | "dispatch.blocked"
  | "dispatch.dry-run-approved"
  | "dispatch.review-prepared"
  | "dispatch.adapter.checked"
  | "dispatch.policy.failed"
  | "operator.handoff-ready"
  | "operator.bridge.prepared"
  | "operator.bridge.idempotent-hit"
  | "operator.bridge.claimed"
  | "operator.bridge.review-running"
  | "operator.bridge.review-completed"
  | "operator.bridge.blocked"
  | "operator.bridge.cancelled"
  | "operator.bridge.failed"
  | "operator.execution.queued"
  | "operator.execution.idempotent-hit"
  | "operator.execution.running-review"
  | "operator.execution.completed-review"
  | "operator.execution.blocked"
  | "operator.execution.cancelled"
  | "operator.execution.failed"
  | "operator.session-submission.dry-run"
  | "operator.session-submission.idempotent-hit"
  | "operator.session-submission.blocked"
  | "operator.session-submission.accepted";

export type GeneratedTask = {
  id: string;
  phase: string;
  title: string;
  owner: string;
  status: GeneratedTaskStatus;
  dependencies: string[];
  acceptance: string[];
  qualityGates: string[];
  rexInputPoint: string;
  checkpoint: string;
  verificationCommands: string[];
};

export type ExecutionEvent = {
  id: string;
  label: string;
  actor: string;
  status: TimelineStatus;
  detail: string;
  timestamp: string;
};

export type GitHubLiveReadiness = {
  status: LiveAdapterStatus;
  configured: boolean;
  repository: string;
  tokenConfigured: boolean;
  permissions: string;
  blocker: string;
  lastError: string;
};

export type PullRequestCheckpoint = {
  prUrl: string;
  branch: string;
  commit: string;
  checkStatus: CheckStatus;
  reviewState: ReviewState;
  risks: string[];
  blockers: string[];
  nextAction: string;
  liveSync: boolean;
  syncSource: SyncSource;
  lastCheckedAt: string;
  liveReadiness: GitHubLiveReadiness;
};

export type LaunchRequest = {
  id: string;
  runId: string;
  packet: string;
  requestedBy: "Rex" | "Thor" | "System";
  approvalState: LaunchApprovalState;
  approvalNote: string;
  createdAt: string;
  updatedAt: string;
  launchReady: boolean;
  nextAction: string;
};

export type ApprovalPolicyStatus = {
  state: "blocked" | "ready-for-approval" | "approved" | "dispatch-ready";
  readyForDispatch: boolean;
  canQueue: boolean;
  canPrepareReviewDispatch: boolean;
  canDispatchExternalWork: boolean;
  reasons: string[];
  requirements: Array<{ id: string; label: string; passed: boolean; detail: string }>;
};

export type ThorReviewHandoff = {
  id: string;
  runId: string;
  jobId: string;
  idempotencyKey: string;
  state: "blocked" | "waiting-for-operator" | "operator-running" | "done";
  adapter: "thor-helper-review";
  reviewModeOnly: boolean;
  externalExecution: boolean;
  preparedAt: string;
  packet: string;
  packetHash: string;
  approvalIntent: "rex-approved-review-dispatch";
  operatorNextAction: string;
  blockerReasons: string[];
};

export type LaunchQueueJob = {
  id: string;
  runId: string;
  launchRequestId: string;
  idempotencyKey: string;
  state: LaunchQueueState;
  requestedBy: "Rex" | "Thor" | "System";
  packetHash: string;
  approvalState: LaunchApprovalState;
  approvalPolicy: ApprovalPolicyStatus;
  createdAt: string;
  updatedAt: string;
  blockedReasons: string[];
  dispatchAdapter: "none" | "safe-backend" | "thor-helper-review";
  auditNote: string;
  reviewHandoff?: ThorReviewHandoff;
};

export type DispatchAdapterCapability = {
  kind: DispatchAdapterKind;
  label: string;
  status: LiveAdapterStatus;
  readOnly: boolean;
  writeEnabled: boolean;
  requiresApproval: boolean;
  supportsDryRun: boolean;
  blocker: string;
};

export type DispatchPlanStep = {
  id: string;
  adapter: DispatchAdapterKind;
  action: string;
  dryRunOnly: boolean;
  externalWrite: boolean;
  approvalRequired: boolean;
  status: "ready" | "blocked";
  detail: string;
};

export type DispatchPlan = {
  id: string;
  runId: string;
  jobId: string;
  mode: DispatchMode;
  idempotencyKey: string;
  createdAt: string;
  approvedForDryRun: boolean;
  liveExecutionBlocked: boolean;
  summary: string;
  blockerReasons: string[];
  adapters: DispatchAdapterCapability[];
  steps: DispatchPlanStep[];
};

export type DispatchAttempt = {
  id: string;
  runId: string;
  jobId: string;
  mode: DispatchMode;
  idempotencyKey: string;
  outcome: DispatchOutcome;
  plan: DispatchPlan;
  reviewHandoff?: ThorReviewHandoff;
  requestedBy: "Rex" | "Thor" | "System";
  createdAt: string;
  updatedAt: string;
  note: string;
};

export type OperatorExecutionPacket = {
  schemaVersion: "mission-control.sdf.operator-packet.v1";
  packetType: "openclaw-review-mode-handoff";
  reviewModeOnly: true;
  externalSideEffectsAllowed: false;
  handoffId: string;
  runId: string;
  runTitle: string;
  queueJobId: string;
  dispatchAttemptId?: string;
  idempotencyKey: string;
  packetHash: string;
  approvalIntent: "rex-approved-review-dispatch";
  operatorInstructions: string[];
  disabledActions: string[];
  taskPacket: string;
  audit: {
    preparedBy: "Rex" | "Thor" | "System";
    preparedAt: string;
    approvalNote: string;
  };
};

export type OperatorBridgeOutboxItem = {
  id: string;
  handoffId: string;
  runId: string;
  queueJobId: string;
  launchRequestId: string;
  dispatchAttemptId?: string;
  idempotencyKey: string;
  state: OperatorBridgeState;
  actor: "Rex" | "Thor" | "System";
  operator?: string;
  packetHash: string;
  reviewModeOnly: true;
  externalExecution: false;
  approvalIntent: "rex-approved-review-dispatch";
  createdAt: string;
  updatedAt: string;
  claimedAt?: string;
  completedAt?: string;
  blockedReasons: string[];
  notes: string[];
  auditMetadata: Record<string, string | number | boolean | null>;
  executionPacket: OperatorExecutionPacket;
};

export type OpenClawSessionsBridgeMode = "review";
export type OpenClawSessionsBridgeSubmissionAction = "dry-run" | "submit";
export type OpenClawSessionsBridgeIdempotencyStatus = "new" | "replayed";
export type OpenClawSessionsBridgeNextAction = "copy-packet-manually" | "configure-bridge" | "fix-request" | "wait-for-session";

export type OpenClawSessionsBridgeApprovalProof = {
  approvalIntent: "rex-approved-review-dispatch";
  approvedBy: "Rex" | "Thor" | "System";
  approvedAt: string;
  approvalNote?: string;
};

export type OpenClawSessionsBridgeAuditContext = {
  runTitle: string;
  source: "mission-control-sdf";
  requestedBy: "Rex" | "Thor" | "System";
  reason: string;
};

export type OpenClawSessionsBridgeRequest = {
  schemaVersion: "mission-control.openclaw.sessions.review.v1";
  runId: string;
  executionId: string;
  handoffId: string;
  idempotencyKey: string;
  target: {
    targetId: string;
    agentId: "thor" | string;
    operator: "Thor" | "StarLord" | string;
    mode: OpenClawSessionsBridgeMode;
  };
  taskPacket: OperatorExecutionPacket;
  allowlistedRepoPath: string;
  approvalProof: OpenClawSessionsBridgeApprovalProof;
  auditContext: OpenClawSessionsBridgeAuditContext;
  createdAt: string;
  requestedBy: "Rex" | "Thor" | "System";
};

export type OpenClawSessionsBridgeResponse = {
  schemaVersion: "mission-control.openclaw.sessions.review.v1";
  accepted: boolean;
  blocked: boolean;
  sessionId?: string;
  jobId?: string;
  idempotencyStatus: OpenClawSessionsBridgeIdempotencyStatus;
  blockerReasons: string[];
  auditEventId: string;
  nextAction: OpenClawSessionsBridgeNextAction;
};

export type OpenClawSessionsBridgeSubmissionAttempt = {
  id: string;
  action: OpenClawSessionsBridgeSubmissionAction;
  idempotencyKey: string;
  targetId: string;
  operator: string;
  agentId: string;
  mode: OpenClawSessionsBridgeMode;
  allowlistedRepoPath: string;
  dryRun: boolean;
  accepted: boolean;
  blocked: boolean;
  idempotencyStatus: OpenClawSessionsBridgeIdempotencyStatus;
  blockerReasons: string[];
  sessionId?: string;
  jobId?: string;
  auditEventId: string;
  nextAction: OpenClawSessionsBridgeNextAction;
  request: OpenClawSessionsBridgeRequest;
  response: OpenClawSessionsBridgeResponse;
  createdAt: string;
  requestedBy: "Rex" | "Thor" | "System";
};

export type OpenClawSessionsBridgeReadiness = {
  bridge: "openclaw-sessions-review-bridge";
  status: "disabled" | "missing-config" | "adapter-unavailable" | "ready";
  enabled: boolean;
  endpointConfigured: boolean;
  tokenConfigured: boolean;
  contractVersionConfigured: boolean;
  liveSubmissionReady: boolean;
  dryRunAvailable: true;
  reviewModeOnly: true;
  allowlistedTargets: Array<{ targetId: string; agentId: string; operator: string; repoPath: string; mode: OpenClawSessionsBridgeMode }>;
  summary: string;
  blockers: string[];
  requiredEnv: string[];
};

export type OperatorExecutionRecord = {
  id: string;
  bridgeItemId: string;
  handoffId: string;
  runId: string;
  runTitle: string;
  queueJobId: string;
  launchRequestId: string;
  dispatchAttemptId?: string;
  idempotencyKey: string;
  state: OperatorExecutionState;
  operatorTarget: string;
  adapter: "openclaw-review-queue";
  reviewModeOnly: true;
  directExecutionEnabled: false;
  liveExecutionBlocked: true;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  executionPacketSnapshot: OperatorExecutionPacket;
  copyableCommand: string;
  resultSummary?: string;
  blockedReasons: string[];
  auditMetadata: Record<string, string | number | boolean | null>;
  submissionAttempts: OpenClawSessionsBridgeSubmissionAttempt[];
  events: Array<{
    id: string;
    action: OperatorExecutionAction;
    actor: "Rex" | "Thor" | "System";
    at: string;
    summary: string;
  }>;
};

export type SdfAuditEvent = {
  id: string;
  action: AuditAction;
  actor: "Rex" | "Thor" | "System";
  summary: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type FactoryRun = {
  id: string;
  title: string;
  state: FactoryRunState;
  createdAt: string;
  updatedAt: string;
  intake: BuildIntake;
  tasks: GeneratedTask[];
  timeline: ExecutionEvent[];
  prCheckpoint: PullRequestCheckpoint;
  readiness: Array<{ id: string; label: string; complete: boolean; detail: string }>;
  launchRequests: LaunchRequest[];
  launchQueue: LaunchQueueJob[];
  approvalPolicy: ApprovalPolicyStatus;
  dispatchAttempts: DispatchAttempt[];
  operatorBridgeOutbox: OperatorBridgeOutboxItem[];
  operatorExecutionRecords: OperatorExecutionRecord[];
  auditTrail: SdfAuditEvent[];
};

export type SdfRunRegistryResponse = {
  runs: FactoryRun[];
  adapter: {
    kind: "file" | "database";
    source: string;
    primary: boolean;
    fallback: "localStorage";
  };
  dispatcher: {
    status: "review-only";
    defaultMode: "dry-run" | "review-dispatch";
    liveExecutionEnabled: boolean;
    summary: string;
    adapters: DispatchAdapterCapability[];
  };
  executionAdapter: {
    adapter: "openclaw-review-queue";
    status: "review-queue-only";
    reviewModeOnly: true;
    directExecutionEnabled: false;
    liveExecutionBlocked: true;
    directRequested: boolean;
    summary: string;
    blockers: string[];
  };
  sessionsBridge: OpenClawSessionsBridgeReadiness;
};
