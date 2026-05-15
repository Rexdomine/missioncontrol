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
  | "operator.handoff-ready";

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
};
