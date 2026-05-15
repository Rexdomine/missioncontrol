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
export type AuditAction = "run.created" | "run.updated" | "sync.requested" | "sync.updated" | "launch.prepared" | "approval.changed";

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
