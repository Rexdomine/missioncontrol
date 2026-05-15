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
export type AuditAction =
  | "run.created"
  | "run.updated"
  | "sync.requested"
  | "sync.updated"
  | "launch.prepared"
  | "launch.queued"
  | "launch.idempotent-hit"
  | "approval.changed"
  | "approval.policy.evaluated";

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
  canDispatchExternalWork: boolean;
  reasons: string[];
  requirements: Array<{ id: string; label: string; passed: boolean; detail: string }>;
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
  dispatchAdapter: "none" | "safe-backend";
  auditNote: string;
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
};
