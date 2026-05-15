import type { ApprovalPolicyStatus, BuildIntake, FactoryRun, FactoryRunState, GeneratedTask, GitHubLiveReadiness, LaunchRequest, SdfAuditEvent } from "./types";

export const defaultIntake: BuildIntake = {
  appName: "Mission Control SDF Phase 4",
  productGoal:
    "Move SDF from browser-local factory controls to API-backed persistence, GitHub checkpoint sync foundations, launch request approvals, and audit logging.",
  mode: "Factory",
  appType: "Next.js product dashboard",
  repoDetails: "missioncontrol · /sdf route · server API-backed registry",
  designAssets:
    "Use the existing Mission Control warm dashboard system; attach screenshots, copy docs, Figma links, or HTML exports when available.",
  requiredFeatures:
    "API-backed run registry, GitHub checkpoint sync status, gated Thor/helper launch packets, Rex approval/audit timeline, clear integration blockers.",
  constraints:
    "No unsafe external actions from the web app. GitHub writes and real agent spawning require explicit Rex approval and safe backend adapters.",
  rexProvides:
    "Approval to launch, priority lane, final acceptance criteria, permission before live external actions, review decision on the PR checkpoint.",
};

export const appTypeTemplates = [
  "Next.js product dashboard",
  "Marketing/landing page",
  "Internal admin tool",
  "SaaS app workflow",
  "API-backed feature",
];

export const defaultGitHubLiveReadiness: GitHubLiveReadiness = {
  status: "not-configured",
  configured: false,
  repository: "",
  tokenConfigured: false,
  permissions: "Read-only GitHub REST API access: pull_requests:read and checks/statuses read. No GitHub mutations are performed by SDF Phase 6.",
  blocker: "Live GitHub sync needs server-only SDF_GITHUB_TOKEN (or GITHUB_TOKEN) and SDF_GITHUB_REPOSITORY (or GITHUB_REPOSITORY).",
  lastError: "",
};

export const defaultApprovalPolicy: ApprovalPolicyStatus = {
  state: "blocked",
  readyForDispatch: false,
  canQueue: false,
  canPrepareReviewDispatch: false,
  canDispatchExternalWork: false,
  reasons: ["No approval policy evaluation has been recorded yet."],
  requirements: [
    { id: "rex-approval", label: "Explicit Rex approval recorded", passed: false, detail: "Rex approval is required before external work dispatch." },
    { id: "launch-packet", label: "Launch packet generated", passed: false, detail: "Prepare a launch packet before queueing." },
    { id: "live-adapter", label: "Live adapter configured before dispatch", passed: false, detail: "Phase 6 keeps external dispatch disabled until future safe live adapters exist." },
  ],
};

const basePhaseBlueprint = [
  {
    phase: "01 · Intake",
    title: "Normalize build brief and source context",
    owner: "Thor Lead Engineer",
    dependencies: ["Project/app name", "Product goal", "Repo/source details"],
    acceptance: ["Scope is explicit", "Out-of-scope work is named", "Rex input list is visible"],
    qualityGates: ["Brief", "Self-check"],
    checkpoint: "Intake packet ready for Rex to approve or revise.",
  },
  {
    phase: "02 · Integration model",
    title: "Pick safe persistence and adapter seams",
    owner: "Backend Builder",
    dependencies: ["Run model", "Runtime storage path", "External credential boundary"],
    acceptance: ["Source of truth is server-owned", "Runtime data is ignored", "Database migration path is documented"],
    qualityGates: ["Interface", "Persistence"],
    checkpoint: "SDF can save and read runs through typed API routes.",
  },
  {
    phase: "03 · Checkpoint sync",
    title: "Represent PR/check status without unsafe GitHub writes",
    owner: "Integration Builder",
    dependencies: ["Branch", "Commit", "PR URL or manual checkpoint", "GitHub token env when live"],
    acceptance: ["Sync source is visible", "Last checked is visible", "Manual/simulated fallback is clear"],
    qualityGates: ["External boundary", "Review"],
    checkpoint: "Rex can see whether status is live, manual, or simulated.",
  },
  {
    phase: "04 · Launch approval",
    title: "Prepare Thor/helper launch packet behind Rex approval",
    owner: "Thor Lead Engineer",
    dependencies: ["Readiness checklist", "Task packet", "Approval state"],
    acceptance: ["No real agent launch occurs", "Approval state is logged", "Next action is explicit"],
    qualityGates: ["Safety", "Audit"],
    checkpoint: "Launch packet is prepared, not executed, until Rex approval and backend adapter exist.",
  },
  {
    phase: "05 · QA and PR handoff",
    title: "Package verification evidence for Rex review",
    owner: "QA + Reviewer",
    dependencies: ["Build slice", "Acceptance criteria", "Quality gates"],
    acceptance: ["Lint/typecheck/build pass", "Route smoke covers /sdf and navigation", "PR summary is readable"],
    qualityGates: ["Verification", "PR", "Rex review"],
    checkpoint: "Rex gets an approve/revise/hold checkpoint with blockers called out.",
  },
];

export function splitItems(value: string) {
  return value
    .split(/\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function nowIso() {
  return new Date().toISOString();
}

export function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildReadiness(intake: BuildIntake) {
  const hasDesign = Boolean(intake.designAssets.trim());
  const hasRepo = Boolean(intake.repoDetails.trim());
  const hasRexGate = Boolean(intake.rexProvides.trim());
  const hasScope = Boolean(intake.productGoal.trim() && intake.requiredFeatures.trim());

  return [
    { id: "scope", label: "Scope and acceptance criteria captured", complete: hasScope, detail: hasScope ? "Goal and feature list are present." : "Add product goal and required features." },
    { id: "source", label: "Repo/source lane identified", complete: hasRepo, detail: hasRepo ? intake.repoDetails : "Add repo, branch, or source details before assigning Thor." },
    { id: "assets", label: "Design/input assets attached or intentionally omitted", complete: hasDesign, detail: hasDesign ? "Frontend lane has visual/source context." : "Add design links or mark design as open for Thor to derive." },
    { id: "approval", label: "Rex approval boundary named", complete: hasRexGate, detail: hasRexGate ? "External actions remain gated by Rex review." : "Name what Rex must approve before launch." },
  ];
}

export function generateTaskGraph(intake: BuildIntake): GeneratedTask[] {
  const features = splitItems(intake.requiredFeatures);
  const risks = splitItems(intake.constraints);
  const rexInputs = splitItems(intake.rexProvides);

  return basePhaseBlueprint.map((phase, index) => {
    const needsInput = index === 1 && !intake.designAssets.trim();
    const constrained = index === 2 && risks.length > 0;
    const dependencyFeature = features[index % Math.max(features.length, 1)];
    const rexInput = rexInputs[index % Math.max(rexInputs.length, 1)];

    return {
      id: `generated-${index + 1}`,
      ...phase,
      title: index === 0 ? `Normalize ${intake.appName || "new build"} brief and source context` : phase.title,
      status: needsInput ? "Input needed" : constrained ? "Gate pending" : index < 2 ? "Ready" : "Queued",
      dependencies: [...phase.dependencies, dependencyFeature ? `Feature focus: ${dependencyFeature}` : `Template: ${intake.appType}`],
      acceptance: [...phase.acceptance, intake.mode === "Autopilot" ? "Approval boundaries are explicit before execution" : `${intake.mode} mode responsibilities are clear`],
      rexInputPoint: rexInput || "Confirm scope and review checkpoint before expansion.",
      verificationCommands: index === 4 ? ["npm run lint", "npm run typecheck", "npm run build", "git diff --check"] : ["self-check", "acceptance review"],
    };
  });
}

export function buildTimeline(tasks: GeneratedTask[]) {
  return tasks.map((task, index) => ({
    id: `timeline-${task.id}`,
    label: task.phase,
    actor: task.owner,
    status: index === 0 ? "Active" as const : task.status === "Input needed" ? "Blocked" as const : "Planned" as const,
    detail: task.checkpoint,
    timestamp: nowIso(),
  }));
}

export function buildPrCheckpoint(intake: BuildIntake) {
  const branchSlug = intake.appName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "factory-run";
  return {
    prUrl: "",
    branch: `feat/${branchSlug}`,
    commit: "pending",
    checkStatus: "Simulated" as const,
    reviewState: "Needs Rex" as const,
    risks: splitItems(intake.constraints).slice(0, 3),
    blockers: buildReadiness(intake).filter((item) => !item.complete).map((item) => item.label),
    nextAction: "Rex reviews the generated packet, then Thor opens a real branch/PR outside the web app.",
    liveSync: false,
    syncSource: "simulated" as const,
    lastCheckedAt: nowIso(),
    liveReadiness: defaultGitHubLiveReadiness,
  };
}

export function appendAudit(run: FactoryRun, event: Omit<SdfAuditEvent, "id" | "createdAt">): FactoryRun {
  return {
    ...run,
    auditTrail: [
      { id: generateId("audit"), createdAt: nowIso(), ...event },
      ...(run.auditTrail ?? []),
    ],
  };
}

export function buildTaskPacket(run: FactoryRun) {
  const taskLines = run.tasks
    .map(
      (task) => `### ${task.phase} — ${task.title}\nOwner/lane: ${task.owner}\nStatus: ${task.status}\nDependencies:\n${task.dependencies.map((item) => `- ${item}`).join("\n")}\nAcceptance criteria:\n${task.acceptance.map((item) => `- ${item}`).join("\n")}\nVerification: ${task.verificationCommands.join(" · ")}\nRex input: ${task.rexInputPoint}\nExpected checkpoint: ${task.checkpoint}`,
    )
    .join("\n\n");

  return `You are Thor/helper agent executing a Mission Control SDF factory run.\n\nRun: ${run.title}\nState: ${run.state}\nMode: ${run.intake.mode}\nRepo/source: ${run.intake.repoDetails}\nProduct goal: ${run.intake.productGoal}\n\nGlobal constraints:\n- Do not perform external writes without Rex approval.\n- Keep changes reviewable and open a PR instead of merging.\n- Report branch, commit, verification, blockers, and PR/checkpoint state.\n- Do not start live external actions until the launch request is approved and the backend adapter is connected.\n\n${taskLines}\n\nPR/checkpoint output expected:\n- Branch: ${run.prCheckpoint.branch}\n- PR URL: ${run.prCheckpoint.prUrl || "pending"}\n- Commit: ${run.prCheckpoint.commit}\n- Checks: ${run.prCheckpoint.checkStatus}\n- Review state: ${run.prCheckpoint.reviewState}\n- Sync source: ${run.prCheckpoint.syncSource}\n- Next action: ${run.prCheckpoint.nextAction}`;
}

export function createLaunchRequest(run: FactoryRun, approvalNote = "Prepared packet only. Rex approval is required before any real launch."): LaunchRequest {
  const launchReady = run.readiness.every((item) => item.complete) && run.state !== "Blocked";
  const timestamp = nowIso();
  return {
    id: generateId("launch"),
    runId: run.id,
    packet: buildTaskPacket(run),
    requestedBy: "System",
    approvalState: "requested",
    approvalNote,
    createdAt: timestamp,
    updatedAt: timestamp,
    launchReady,
    nextAction: launchReady
      ? "Rex can approve this prepared packet; Phase 7 may then prepare a review-mode Thor/helper operator handoff without spawning agents."
      : "Resolve readiness blockers before Rex approves launch.",
  };
}

export function createRun(intake: BuildIntake, state: FactoryRunState = "Draft"): FactoryRun {
  const tasks = generateTaskGraph(intake);
  const createdAt = nowIso();
  const run: FactoryRun = {
    id: generateId("run"),
    title: intake.appName || "Untitled factory run",
    state,
    createdAt,
    updatedAt: createdAt,
    intake,
    tasks,
    timeline: buildTimeline(tasks),
    prCheckpoint: buildPrCheckpoint(intake),
    readiness: buildReadiness(intake),
    launchRequests: [],
    launchQueue: [],
    approvalPolicy: defaultApprovalPolicy,
    dispatchAttempts: [],
    operatorBridgeOutbox: [],
    auditTrail: [],
  };
  return appendAudit(run, { action: "run.created", actor: "System", summary: "Factory run created through SDF API." });
}

export function createSeedRuns(): FactoryRun[] {
  const readyRun = createRun(defaultIntake, "Ready to launch");
  return [
    {
      ...readyRun,
      id: "seed-sdf-phase4",
      createdAt: "2026-05-15T07:32:00.000Z",
      updatedAt: "2026-05-15T07:32:00.000Z",
      prCheckpoint: {
        ...readyRun.prCheckpoint,
        branch: "sdf-phase4-integration-foundations",
        checkStatus: "Simulated",
        reviewState: "Needs Rex",
        syncSource: "simulated",
        lastCheckedAt: "2026-05-15T07:32:00.000Z",
        nextAction: "Use the API-backed registry, prepare a gated launch request, then enable live sync only after backend credentials are configured.",
        liveReadiness: defaultGitHubLiveReadiness,
      },
      launchQueue: [],
      dispatchAttempts: [],
      operatorBridgeOutbox: [],
      approvalPolicy: defaultApprovalPolicy,
      auditTrail: [
        {
          id: "audit-seed-phase4",
          action: "run.created",
          actor: "System",
          summary: "Seeded Phase 4 API-backed integration foundation run.",
          createdAt: "2026-05-15T07:32:00.000Z",
        },
      ],
    },
  ];
}
