export type ModuleKey =
  | "today"
  | "agent-os"
  | "projects"
  | "calendar"
  | "job-hunt"
  | "content"
  | "approvals"
  | "chat";

export interface SidebarItem {
  label: string;
  href: string;
  key: ModuleKey;
  status: "live" | "queued";
}

export interface FocusItem {
  id: string;
  title: string;
  detail: string;
  tag: "Priority 1" | "In Build" | "Monitor";
  href?: string;
}

export interface AgendaItem {
  id: string;
  time: string;
  title: string;
  note: string;
  href?: string;
}

export interface ProjectPulseItem {
  id: string;
  name: string;
  status: "Active" | "Stable" | "Planning" | "Waiting" | "At Risk";
  next: string;
  href?: string;
}

export interface ApprovalItem {
  id: string;
  title: string;
  severity: "Low" | "Medium" | "High";
  source: string;
  action: string;
}

export interface AlertItem {
  id: string;
  type: "Signal" | "Build" | "Warning";
  title: string;
  body: string;
}

export interface ChatThread {
  id: string;
  title: string;
  summary: string;
  status: "Active" | "Queued" | "Stable";
}

export interface ProjectBoardLane {
  id: string;
  title: string;
  detail: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  laneId: ProjectBoardLane["id"];
  status: "Active" | "Waiting" | "Stable" | "At Risk";
  priority: "P1" | "P2";
  owner: string;
  targetWindow: string;
  summary: string;
  nextAction: string;
  currentFocus: string;
  blockers: string[];
  waitingOn: string[];
  nextActions: string[];
  linkedEventIds: string[];
  recentMoves: string[];
}

export interface WaitingOnItem {
  id: string;
  projectId: ProjectRecord["id"];
  title: string;
  owner: string;
  eta: string;
  impact: string;
}

export interface CalendarDay {
  id: string;
  label: string;
  dateLabel: string;
  focus: string;
  load: "Heavy" | "Balanced" | "Light";
}

export interface CalendarEvent {
  id: string;
  dayId: CalendarDay["id"];
  start: string;
  end: string;
  title: string;
  type: "Build" | "Call" | "Review" | "Prep";
  summary: string;
  location: string;
  organizer: string;
  projectId: ProjectRecord["id"];
  prepStatus: "Ready" | "Prep needed" | "In motion";
  followUpStatus: "Done" | "Queued" | "Drafting" | "Send today";
  prepItems: string[];
  followUps: string[];
  executionContext: string[];
}

export interface AgentStatus {
  id: string;
  name: string;
  role: string;
  state: "Executing" | "Paused" | "Monitoring" | "Idle";
  project: string;
  currentTask: string;
  lastAction: string;
  nextAction: string;
  risk: "Low" | "Medium" | "High";
  telemetry: Array<{ label: string; value: string }>;
}

export interface OperatingTask {
  id: string;
  title: string;
  owner: string;
  lane: "Active" | "Paused" | "Monitoring" | "Ready";
  project: string;
  summary: string;
  blocker: string;
  nextAction: string;
  evidence: string[];
}

export interface ActivityEvent {
  id: string;
  time: string;
  actor: string;
  type: "Repo" | "Deploy" | "Memory" | "Automation" | "Planning";
  title: string;
  detail: string;
  artifact: string;
}

export interface SkillRegistryItem {
  id: string;
  name: string;
  category: "Repo" | "Memory" | "Ops" | "Browser" | "GitHub" | "Workflow";
  status: "Ready" | "Needs attention" | "Queued";
  lastUsed: string;
  purpose: string;
}

export interface ContinuityRecord {
  id: string;
  label: string;
  source: string;
  state: string;
  next: string;
}

export interface ReadinessGate {
  id: string;
  label: string;
  owner: string;
  status: "Ready" | "Watch" | "Blocked";
  evidence: string;
  action: string;
}

export interface CommandRunbook {
  id: string;
  title: string;
  intent: string;
  trigger: string;
  agent: string;
  mode: "Autonomous" | "Confirm first" | "Manual";
  checks: string[];
}

export interface DispatchQueueItem {
  id: string;
  title: string;
  agent: string;
  priority: "P1" | "P2" | "P3";
  readiness: "Ready" | "Needs confirmation" | "Blocked";
  scope: string;
  nextStep: string;
}

export interface PublicationPipelineItem {
  id: string;
  label: string;
  status: "Done" | "Active" | "Next";
  detail: string;
}

export interface JobRole {
  id: string;
  company: string;
  role: string;
  fitScore: number;
  location: string;
  stage: "Shortlist" | "Tailoring" | "Applied" | "Follow-up";
  priority: "P1" | "P2" | "P3";
  deadline: string;
  whyItFits: string;
  tailoredAngles: string[];
  nextAction: string;
}

export interface ApplicationStage {
  id: string;
  title: string;
  detail: string;
  roleIds: JobRole["id"][];
}

export interface JobHuntOutput {
  id: string;
  cadence: "Daily" | "Weekly";
  label: string;
  state: "Ready" | "Due" | "Watch";
  detail: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  pillar: "Prompt to Code" | "Founder Ops" | "AI Native Engineering" | "Personal";
  stage: "Idea" | "Script" | "Shoot" | "Edit" | "Publish";
  format: "Short" | "Long-form" | "Carousel";
  hook: string;
  nextAction: string;
}

export interface ContentCalendarItem {
  id: string;
  date: string;
  title: string;
  channel: string;
  state: "Planned" | "Shoot ready" | "Editing" | "Scheduled";
}

export interface ProductionStage {
  id: string;
  title: string;
  detail: string;
  ideaIds: ContentIdea["id"][];
}

export const sidebarItems: SidebarItem[] = [
  { key: "today", label: "Today", href: "/", status: "live" },
  { key: "agent-os", label: "Agent OS", href: "/agent-os", status: "live" },
  { key: "projects", label: "Projects", href: "/projects", status: "live" },
  { key: "calendar", label: "Calendar", href: "/calendar", status: "live" },
  { key: "job-hunt", label: "Job Hunt", href: "/job-hunt", status: "live" },
  { key: "content", label: "Content", href: "/content", status: "live" },
  { key: "approvals", label: "Approvals", href: "/approvals", status: "live" },
  { key: "chat", label: "Chat", href: "/chat", status: "live" },
];

export const agentStatuses: AgentStatus[] = [
  {
    id: "agent-starlord",
    name: "StarLord",
    role: "Primary orchestrator",
    state: "Executing",
    project: "Mission Control",
    currentTask: "Build Agent OS Phase 3 so job hunt and content systems become actionable modules.",
    lastAction: "Confirmed Phase 2 PR #3 is merged into `main` and started Phase 3 from the fresh baseline.",
    nextAction: "Verify the new Job Hunt and Content modules, then publish a fresh Phase 3 PR.",
    risk: "Low",
    telemetry: [
      { label: "Mode", value: "Repo execution" },
      { label: "Surface", value: "Job Hunt + Content" },
      { label: "PR Gate", value: "Required" },
    ],
  },
  {
    id: "agent-thor",
    name: "Thor",
    role: "Senior full-stack delivery lane",
    state: "Executing",
    project: "Mission Control",
    currentTask: "Implement Phase 3 from clean `origin/main` on `thor/agent-os-phase3`.",
    lastAction: "Created the Phase 3 branch after Phase 2 merged into main.",
    nextAction: "Run lint, typecheck, build, smoke, push, and open the Phase 3 PR.",
    risk: "Medium",
    telemetry: [
      { label: "Branch", value: "thor/agent-os-phase3" },
      { label: "Base", value: "origin/main" },
      { label: "Deploy", value: "Vercel preview" },
    ],
  },
  {
    id: "agent-automation",
    name: "Automation",
    role: "Recurring background operations",
    state: "Monitoring",
    project: "Remote role hunt",
    currentTask: "Weekday search and email workflow remains the standing recurring lane.",
    lastAction: "Latest run fell back to manual web scan because Tavily runtime auth was pending.",
    nextAction: "Keep automation visible and flag connection drift before the next weekday run.",
    risk: "Medium",
    telemetry: [
      { label: "Cadence", value: "Weekdays" },
      { label: "Delivery", value: "Email" },
      { label: "Runtime", value: "Watch auth" },
    ],
  },
];

export const operatingTasks: OperatingTask[] = [
  {
    id: "task-mission-control-agent-os",
    title: "Mission Control Agent OS Phase 3",
    owner: "Thor",
    lane: "Active",
    project: "Mission Control",
    summary:
      "Turn the recurring job hunt and content workflows into visible, actionable Mission Control pipelines.",
    blocker: "None. Fresh PR required before handoff.",
    nextAction: "Verify Phase 3 modules and publish a fresh PR for review.",
    evidence: [
      "Branch cut from merged Phase 2 `origin/main`",
      "Job Hunt and Content routes moved from queued placeholders to live modules",
      "PR gate remains mandatory before handoff",
    ],
  },
  {
    id: "task-nimet-lexical-deploy",
    title: "NiMet Lexical editor deployment",
    owner: "Thor",
    lane: "Paused",
    project: "NiMet OnePortal",
    summary:
      "PR #45 is merged, but the live containers are stale because the VPS deploy failed before rollout.",
    blocker: "VPS root disk is full: 15G total, 15G used, 0 available.",
    nextAction:
      "When NiMet resumes, free safe disk space, rerun deploy to `858bbb3`, then verify `/apps/documents/new`.",
    evidence: [
      "`last_deployed_sha` still at PR #44 `b99cc56`",
      "`nimet-oneportal-deploy.service` failed with out-of-diskspace",
      "Lexical files are present in VPS checkout but not confirmed live",
    ],
  },
  {
    id: "task-role-hunt",
    title: "Weekday remote role hunt",
    owner: "StarLord",
    lane: "Monitoring",
    project: "Career and Work",
    summary:
      "Recurring job-search automation remains useful, but connector state should be visible when runtime auth drifts.",
    blocker: "Tavily connection was pending during the latest run.",
    nextAction: "Surface next-run readiness and output quality from Mission Control.",
    evidence: [
      "Cron schedule recorded in memory",
      "Email delivery path exists",
      "Runtime search connector needs visibility",
    ],
  },
];

export const activityTimeline: ActivityEvent[] = [
  {
    id: "activity-agent-os-start",
    time: "12:52",
    actor: "Thor",
    type: "Planning",
    title: "Agent OS Phase 2 started",
    detail:
      "Mission Control lane selected and implementation scoped to command runbooks, safety gates, dispatch state, and reviewable publication flow.",
    artifact: "Branch `thor/agent-os-phase2`",
  },
  {
    id: "activity-nimet-pause",
    time: "12:36",
    actor: "StarLord",
    type: "Memory",
    title: "NiMet pause marker saved",
    detail:
      "Saved the exact PR #45 deploy blocker so the project can resume from disk cleanup and redeploy.",
    artifact: "memory/tasks.md",
  },
  {
    id: "activity-nimet-deploy",
    time: "11:18",
    actor: "Thor",
    type: "Deploy",
    title: "NiMet VPS disk full",
    detail:
      "Confirmed root filesystem at 100% and deploy marker still behind the Lexical editor merge.",
    artifact: "VPS `df -h` + deploy service status",
  },
  {
    id: "activity-role-hunt",
    time: "08:00",
    actor: "Automation",
    type: "Automation",
    title: "Remote role hunt checked",
    detail:
      "Daily workflow ran with connector caveat recorded for future reliability tracking.",
    artifact: "memory/tools.md",
  },
];

export const skillRegistry: SkillRegistryItem[] = [
  {
    id: "skill-thor-repo",
    name: "Thor repo workflow",
    category: "Repo",
    status: "Ready",
    lastUsed: "Now",
    purpose: "Inspect, implement, verify, commit, push, and publish repo work through a fresh PR.",
  },
  {
    id: "skill-pr-gate",
    name: "PR publication gate",
    category: "GitHub",
    status: "Ready",
    lastUsed: "Now",
    purpose: "Prevents local-only completion for reviewable work by requiring a fresh PR.",
  },
  {
    id: "skill-memory",
    name: "StarLord memory",
    category: "Memory",
    status: "Ready",
    lastUsed: "Today",
    purpose: "Keeps durable project, task, tool, and preference context across sessions.",
  },
  {
    id: "skill-proactive",
    name: "Proactive ops",
    category: "Ops",
    status: "Ready",
    lastUsed: "Today",
    purpose: "Runs low-risk checks, verifies state directly, and stays quiet unless there is useful signal.",
  },
  {
    id: "skill-browser",
    name: "Browser automation",
    category: "Browser",
    status: "Needs attention",
    lastUsed: "May 5",
    purpose: "Visual verification and website interaction; local Chromium libraries need repair for screenshots.",
  },
  {
    id: "skill-taskflow",
    name: "TaskFlow",
    category: "Workflow",
    status: "Queued",
    lastUsed: "Not active",
    purpose: "Durable detached workflows for multi-step background jobs once Mission Control exposes controls.",
  },
];

export const continuityRecords: ContinuityRecord[] = [
  {
    id: "continuity-active-lane",
    label: "Active lane",
    source: "Current request",
    state: "Mission Control Agent OS Phase 3",
    next: "Make Job Hunt and Content pipelines live, actionable modules.",
  },
  {
    id: "continuity-nimet",
    label: "Paused lane",
    source: "memory/tasks.md",
    state: "NiMet OnePortal paused at deploy blocker.",
    next: "Free VPS disk, redeploy PR #45, verify Lexical editor.",
  },
  {
    id: "continuity-tools",
    label: "Tool readiness",
    source: "TOOLS.md + memory/tools.md",
    state: "GitHub CLI is ready; NiMet SSH helper needs PATH-wrapped sshpass/ssh in this runtime.",
    next: "Use readiness gates before deeper execution controls mutate external systems.",
  },
  {
    id: "continuity-pr-rule",
    label: "Publication rule",
    source: "Thor PR gate",
    state: "Every reviewable repo update ends in a fresh PR unless explicitly paused.",
    next: "Run verification and completion gate before handoff.",
  },
];

export const readinessGates: ReadinessGate[] = [
  {
    id: "gate-project-context",
    label: "Project lane resolved",
    owner: "StarLord",
    status: "Ready",
    evidence: "Mission Control matched by Phase 2 cue, repo path, and active Agent OS branch.",
    action: "Keep branch and PR state visible before repo execution starts.",
  },
  {
    id: "gate-publication",
    label: "PR publication path",
    owner: "Thor",
    status: "Ready",
    evidence: "GitHub CLI auth is available and `origin/main` is the review base.",
    action: "Open a fresh PR after lint, typecheck, build, and completion gate pass.",
  },
  {
    id: "gate-browser",
    label: "Visual smoke test",
    owner: "Thor",
    status: "Watch",
    evidence: "Local HTTP route checks are reliable; screenshot runtime can need browser-lib repair.",
    action: "Use build plus route smoke now, then restore screenshot checks as a follow-up.",
  },
  {
    id: "gate-external-actions",
    label: "External side effects",
    owner: "StarLord",
    status: "Ready",
    evidence: "Phase 2 keeps execution controls local and does not send messages or mutate external systems.",
    action: "Require confirmation before sensitive, destructive, public, or irreversible actions.",
  },
];

export const commandRunbooks: CommandRunbook[] = [
  {
    id: "runbook-repo-slice",
    title: "Ship a repo slice",
    intent: "Move a scoped implementation from request to reviewable PR.",
    trigger: "Rex asks Thor to implement, fix, or extend a project surface.",
    agent: "Thor",
    mode: "Autonomous",
    checks: [
      "Resolve project lane and base branch",
      "Inspect dirty state before edits",
      "Run lint, typecheck, build, and PR gate",
    ],
  },
  {
    id: "runbook-resume-blocker",
    title: "Resume a paused blocker",
    intent: "Pick up a known stalled lane without asking Rex to restate context.",
    trigger: "A task says still, again, production, deploy, VPS, or blocked.",
    agent: "StarLord",
    mode: "Confirm first",
    checks: [
      "Recall memory and tool notes first",
      "Separate code defects from environment defects",
      "Ask only when the next action is sensitive or irreversible",
    ],
  },
  {
    id: "runbook-routine-ops",
    title: "Run routine operations",
    intent: "Handle low-risk checks, summaries, and upkeep quietly.",
    trigger: "Heartbeat, cron follow-up, calendar review, or memory upkeep.",
    agent: "StarLord",
    mode: "Autonomous",
    checks: [
      "Use local files and tool state before web",
      "Stay quiet when no user-facing signal changed",
      "Capture durable decisions in memory",
    ],
  },
];

export const dispatchQueue: DispatchQueueItem[] = [
  {
    id: "dispatch-agent-os-phase2",
    title: "Mission Control Agent OS Phase 3",
    agent: "Thor",
    priority: "P1",
    readiness: "Ready",
    scope: "Job Hunt role pipeline plus Content production board and publishing calendar.",
    nextStep: "Verify locally, push a fresh branch, and open the Phase 3 PR.",
  },
  {
    id: "dispatch-nimet-recovery",
    title: "NiMet deploy recovery",
    agent: "Thor",
    priority: "P2",
    readiness: "Blocked",
    scope: "VPS disk cleanup and redeploy after Rex chooses to resume the production lane.",
    nextStep: "Keep blocker visible; do not mutate host state from Mission Control.",
  },
  {
    id: "dispatch-role-hunt",
    title: "Role hunt automation readiness",
    agent: "StarLord",
    priority: "P3",
    readiness: "Needs confirmation",
    scope: "Expose search connector readiness and next-run quality signals.",
    nextStep: "Check connector state during the next scheduled run and record the outcome.",
  },
];

export const publicationPipeline: PublicationPipelineItem[] = [
  {
    id: "pipeline-scope",
    label: "Scope",
    status: "Done",
    detail: "Phase 3 is limited to actionable Job Hunt and Content workflow surfaces with typed seed data.",
  },
  {
    id: "pipeline-verify",
    label: "Verify",
    status: "Active",
    detail: "Run lint, typecheck, build, and a local route smoke before publication.",
  },
  {
    id: "pipeline-pr",
    label: "Publish",
    status: "Next",
    detail: "Push `thor/agent-os-phase3` and open a PR against `main` for Vercel preview testing.",
  },
];

export const focusItems: FocusItem[] = [
  {
    id: "focus-birthday-content",
    title: "Birthday content shoot lock-in",
    detail:
      "Call Moeshen Art Gallery, confirm access rules, and pick a shoot window before May 8.",
    tag: "Priority 1",
    href: "/projects?project=birthday-content",
  },
  {
    id: "focus-agent-os",
    title: "Mission Control Agent OS",
    detail:
      "Ship the first operating-system layer for agents, task state, skills, activity, and continuity.",
    tag: "In Build",
    href: "/agent-os",
  },
  {
    id: "focus-role-hunt",
    title: "Role hunt review",
    detail:
      "Keep weekday automation running and review shortlist quality on Monday morning.",
    tag: "Monitor",
    href: "/projects?project=remote-role-hunt",
  },
];

export const agendaItems: AgendaItem[] = [
  {
    id: "agenda-planning-block",
    time: "09:00",
    title: "Phase 2 ship block",
    note: "Finish project board interactions, calendar detail context, and the responsive pass.",
    href: "/calendar?day=mon-apr-27&event=event-phase-two-ship",
  },
  {
    id: "agenda-gallery-call",
    time: "13:00",
    title: "Call Moeshen Art Gallery",
    note: "Need a location answer before the birthday content plan can lock.",
    href: "/calendar?day=tue-apr-28&event=event-gallery-call",
  },
  {
    id: "agenda-content-refinement",
    time: "16:30",
    title: "Role-hunt review prep",
    note: "Package shortlist notes so Monday review produces immediate applications.",
    href: "/calendar?day=mon-apr-27&event=event-role-review",
  },
];

export const projectBoardLanes: ProjectBoardLane[] = [
  {
    id: "commit",
    title: "Commit This Week",
    detail: "Work already moving and worth pushing over the line now.",
  },
  {
    id: "waiting",
    title: "Waiting On Others",
    detail: "External inputs that can stall progress if they stay invisible.",
  },
  {
    id: "steady",
    title: "Steady Systems",
    detail: "Routines that need cadence, not panic.",
  },
];

export const projectPortfolio: ProjectRecord[] = [
  {
    id: "missioncontrol-phase-two",
    name: "Mission Control Phase 2",
    laneId: "commit",
    status: "Active",
    priority: "P1",
    owner: "Thor + StarLord",
    targetWindow: "Ship Saturday",
    summary:
      "Replace placeholder routes with usable project and calendar surfaces that make execution planning readable in one pass.",
    nextAction:
      "Finish verification, tighten responsive density, and keep cross-module state coherent with Today.",
    currentFocus:
      "Projects and Calendar should feel like the same operating system, not two mock pages.",
    blockers: [
      "Need final verification clean across typecheck, build, and lint before calling the phase live.",
    ],
    waitingOn: [],
    nextActions: [
      "Confirm board/detail layout holds up on smaller screens.",
      "Keep the metrics and status language aligned with the Today page.",
      "Validate the new client interactions without widening scope into backend work.",
    ],
    linkedEventIds: ["event-phase-two-ship", "event-integration-review"],
    recentMoves: [
      "Replaced route placeholders with module-specific operational surfaces.",
      "Promoted Projects and Calendar from queued to live in navigation.",
      "Unified project and event context through shared app data.",
    ],
  },
  {
    id: "birthday-content",
    name: "Birthday Content",
    laneId: "waiting",
    status: "Waiting",
    priority: "P1",
    owner: "Rex",
    targetWindow: "Before Thu May 8",
    summary:
      "Birthday shoot planning needs a location, a locked concept, and a clean shot list before production can move.",
    nextAction:
      "Get the gallery answer and convert the concept into a confirmed shot plan the same day.",
    currentFocus:
      "Treat the gallery response as the gate for every other content decision.",
    blockers: [
      "No confirmed venue yet.",
      "Final shot assistant availability is still unconfirmed.",
    ],
    waitingOn: [
      "Moeshen Art Gallery response on access rules and available windows.",
      "Assistant confirmation for handheld and behind-the-scenes coverage.",
    ],
    nextActions: [
      "Prepare a fallback location shortlist before the gallery call ends.",
      "Draft the shot list as soon as a venue is confirmed.",
      "Turn outfit options into a simple yes/no decision before the prep session.",
    ],
    linkedEventIds: ["event-gallery-call", "event-shot-list-prep"],
    recentMoves: [
      "Concept direction is clear enough to start locking logistics.",
      "Reminder and phone numbers are already in place for outreach.",
    ],
  },
  {
    id: "remote-role-hunt",
    name: "Remote Role Hunt",
    laneId: "steady",
    status: "Stable",
    priority: "P2",
    owner: "StarLord",
    targetWindow: "Monday review",
    summary:
      "The weekday role-hunt automation is healthy; the human review loop is the leverage point now.",
    nextAction:
      "Review Monday shortlist, score the strongest roles fast, and send two tailored applications.",
    currentFocus:
      "Keep output quality high without overcomplicating the workflow.",
    blockers: [],
    waitingOn: [
      "Fresh shortlist export from the next weekday run.",
    ],
    nextActions: [
      "Audit shortlist quality before spending time on applications.",
      "Promote standout roles into a fast outreach queue.",
      "Capture useful reasons when a role is skipped so the workflow improves.",
    ],
    linkedEventIds: ["event-role-review"],
    recentMoves: [
      "Default outreach template is already locked in workspace standards.",
      "Current risk is drift in shortlist quality, not pipeline setup.",
    ],
  },
  {
    id: "approval-noise-cleanup",
    name: "Approval Noise Cleanup",
    laneId: "commit",
    status: "At Risk",
    priority: "P2",
    owner: "StarLord",
    targetWindow: "Next cron cycle",
    summary:
      "Approval-oriented execution paths are still creating stale prompts, which makes routine operations noisier than they should be.",
    nextAction:
      "Catch the next recurrence with enough detail to narrow the noisy execution path and remove it.",
    currentFocus:
      "The problem is not missing approval handling; it is preventable execution flow noise.",
    blockers: [
      "Need one clean reproduction tied to the exact maintenance path that emitted the stale prompt.",
    ],
    waitingOn: [
      "Next scheduler log snapshot after the cleanup path runs again.",
    ],
    nextActions: [
      "Collect the next noisy prompt with its execution context.",
      "Replace the approval-oriented command path with a routine-safe equivalent.",
      "Verify the scheduler stays quiet after the fix.",
    ],
    linkedEventIds: ["event-approval-review"],
    recentMoves: [
      "The issue is already diagnosed as workflow noise rather than a stuck background task.",
    ],
  },
];

export const projectWaitingItems: WaitingOnItem[] = [
  {
    id: "wait-gallery-window",
    projectId: "birthday-content",
    title: "Gallery access and timing",
    owner: "Moeshen Art Gallery",
    eta: "Today, 13:30",
    impact: "Blocks shoot date, shot list, and outfit finalization.",
  },
  {
    id: "wait-assistant-confirmation",
    projectId: "birthday-content",
    title: "Assistant confirmation",
    owner: "Creative support",
    eta: "By end of day",
    impact: "Affects behind-the-scenes capture and pacing on shoot day.",
  },
  {
    id: "wait-role-shortlist",
    projectId: "remote-role-hunt",
    title: "Fresh shortlist export",
    owner: "Weekday automation",
    eta: "Mon Apr 27, 08:30",
    impact: "Determines whether Monday review becomes a real applications session.",
  },
  {
    id: "wait-approval-log",
    projectId: "approval-noise-cleanup",
    title: "Next cron log snapshot",
    owner: "Maintenance run",
    eta: "Next scheduled cycle",
    impact: "Needed to isolate the noisy approval path confidently.",
  },
];

export const calendarWeek: CalendarDay[] = [
  {
    id: "mon-apr-27",
    label: "Mon",
    dateLabel: "Apr 27",
    focus: "Ship phase-two work and start the week from a clean board.",
    load: "Heavy",
  },
  {
    id: "tue-apr-28",
    label: "Tue",
    dateLabel: "Apr 28",
    focus: "Push outreach and unblock the birthday content plan.",
    load: "Balanced",
  },
  {
    id: "wed-apr-29",
    label: "Wed",
    dateLabel: "Apr 29",
    focus: "Use review time to connect planning to execution follow-through.",
    load: "Balanced",
  },
  {
    id: "thu-apr-30",
    label: "Thu",
    dateLabel: "Apr 30",
    focus: "Turn prep work into locked assets and next commitments.",
    load: "Heavy",
  },
  {
    id: "fri-may-01",
    label: "Fri",
    dateLabel: "May 1",
    focus: "Close open loops so the next week does not begin with drift.",
    load: "Light",
  },
];

export const calendarEvents: CalendarEvent[] = [
  {
    id: "event-phase-two-ship",
    dayId: "mon-apr-27",
    start: "09:00",
    end: "10:45",
    title: "Phase 2 ship block",
    type: "Build",
    summary:
      "Finalize the Projects and Calendar modules, then run the verification suite before calling the phase live.",
    location: "Mission Control workspace",
    organizer: "Thor",
    projectId: "missioncontrol-phase-two",
    prepStatus: "In motion",
    followUpStatus: "Done",
    prepItems: [
      "Keep page metrics and sidebar states consistent with the rest of the shell.",
      "Verify the new layouts still read cleanly at mobile widths.",
    ],
    followUps: [
      "Post final engineering handoff with exact checks run.",
    ],
    executionContext: [
      "Primary deliverable: production-ready `/projects` and `/calendar` routes.",
      "Constraint: no backend expansion while closing the UI phase.",
    ],
  },
  {
    id: "event-role-review",
    dayId: "mon-apr-27",
    start: "16:30",
    end: "17:15",
    title: "Role-hunt weekly review",
    type: "Review",
    summary:
      "Review the newest shortlist and move the strongest roles straight into tailored applications.",
    location: "Remote",
    organizer: "StarLord",
    projectId: "remote-role-hunt",
    prepStatus: "Prep needed",
    followUpStatus: "Send today",
    prepItems: [
      "Pull the latest shortlist output before the review starts.",
      "Prepare a simple scorecard so the best roles surface quickly.",
    ],
    followUps: [
      "Send two tailored applications before the day ends.",
      "Capture why the skipped roles were not strong enough.",
    ],
    executionContext: [
      "Use the current outreach template rather than rewriting messaging from scratch.",
      "The main risk is weak role quality, not lack of process.",
    ],
  },
  {
    id: "event-gallery-call",
    dayId: "tue-apr-28",
    start: "13:00",
    end: "13:30",
    title: "Gallery outreach call",
    type: "Call",
    summary:
      "Confirm access rules, available windows, and any restrictions before the birthday concept is finalized.",
    location: "Phone",
    organizer: "Rex",
    projectId: "birthday-content",
    prepStatus: "Prep needed",
    followUpStatus: "Send today",
    prepItems: [
      "Have the concept summary ready in one sentence.",
      "Prepare fallback dates and a fast backup location list.",
    ],
    followUps: [
      "Send confirmation or thank-you message right after the call.",
      "Update the project with the venue answer before switching tasks.",
    ],
    executionContext: [
      "This call decides whether the shoot plan can move into production mode.",
      "If the gallery says no, switch immediately to the fallback shortlist.",
    ],
  },
  {
    id: "event-integration-review",
    dayId: "wed-apr-29",
    start: "11:00",
    end: "11:45",
    title: "Projects-to-calendar integration review",
    type: "Review",
    summary:
      "Check that upcoming commitments and project next actions still line up after the phase-two UI work ships.",
    location: "Mission Control workspace",
    organizer: "StarLord",
    projectId: "missioncontrol-phase-two",
    prepStatus: "Ready",
    followUpStatus: "Queued",
    prepItems: [
      "Bring the live board and day plan into the same review.",
    ],
    followUps: [
      "Capture any gaps where meetings are still disconnected from project actions.",
    ],
    executionContext: [
      "The bar is practical coherence, not a perfect system model.",
    ],
  },
  {
    id: "event-shot-list-prep",
    dayId: "thu-apr-30",
    start: "10:30",
    end: "11:30",
    title: "Birthday shoot prep session",
    type: "Prep",
    summary:
      "Turn the confirmed concept into a shot list, outfit order, and location-aware plan.",
    location: "Notes + wardrobe setup",
    organizer: "Rex",
    projectId: "birthday-content",
    prepStatus: "In motion",
    followUpStatus: "Queued",
    prepItems: [
      "Bring the final venue answer into the session.",
      "Pick a simple first-three-shots sequence before debating extras.",
    ],
    followUps: [
      "Share the shot list with anyone helping on the day.",
      "Lock the packing list before the evening ends.",
    ],
    executionContext: [
      "This session is where the idea becomes executable, not just attractive.",
    ],
  },
  {
    id: "event-approval-review",
    dayId: "fri-may-01",
    start: "09:30",
    end: "10:00",
    title: "Approval noise review",
    type: "Review",
    summary:
      "Inspect the newest scheduler output and decide whether the stale approval prompt path is fully contained.",
    location: "Ops logs",
    organizer: "StarLord",
    projectId: "approval-noise-cleanup",
    prepStatus: "Ready",
    followUpStatus: "Drafting",
    prepItems: [
      "Have the last clean and noisy runs side by side for comparison.",
    ],
    followUps: [
      "Write the exact remediation note if the path is now isolated.",
    ],
    executionContext: [
      "The target is less operational friction, not a broad refactor.",
    ],
  },
];

export const projectPulse: ProjectPulseItem[] = projectPortfolio.slice(0, 3).map(
  (project) => ({
    id: project.id,
    name: project.name,
    status: project.status,
    next: project.nextAction,
    href: `/projects?project=${project.id}`,
  }),
);

export const jobRoles: JobRole[] = [
  {
    id: "role-ai-fullstack-platform",
    company: "Northstar AI Labs",
    role: "AI Native Fullstack Engineer",
    fitScore: 94,
    location: "Remote · EU/Africa overlap",
    stage: "Tailoring",
    priority: "P1",
    deadline: "Apply today",
    whyItFits:
      "Strong match for product engineering, agent workflows, Next.js, and AI-native delivery ownership.",
    tailoredAngles: [
      "Lead with Mission Control as proof of agentic product thinking.",
      "Position Thor/StarLord workflow as practical full-stack automation experience.",
      "Mention CounterFix founder context for product judgment and execution speed.",
    ],
    nextAction: "Tailor the opening paragraph and ship the application before close of day.",
  },
  {
    id: "role-product-engineer-ai",
    company: "ForgeWorks",
    role: "Senior Product Engineer, AI Tools",
    fitScore: 88,
    location: "Remote · Global",
    stage: "Shortlist",
    priority: "P1",
    deadline: "Review by Friday",
    whyItFits:
      "Requires rapid UI delivery, workflow design, and judgment around human-in-the-loop automation.",
    tailoredAngles: [
      "Showcase dashboard and operator-console work across Mission Control and NiMet.",
      "Emphasize verified PR workflow and strong product taste.",
      "Frame founder experience as bias for useful, shippable tools.",
    ],
    nextAction: "Confirm compensation/location fit, then move to tailoring if the signal stays strong.",
  },
  {
    id: "role-agent-platform",
    company: "RelayOps",
    role: "Agent Platform Engineer",
    fitScore: 82,
    location: "Remote · US overlap preferred",
    stage: "Applied",
    priority: "P2",
    deadline: "Follow up in 3 days",
    whyItFits:
      "Agent orchestration and operational tooling are aligned, but timezone expectations need watching.",
    tailoredAngles: [
      "Anchor on safe autonomy, approval boundaries, and durable memory design.",
      "Use Mission Control Agent OS as the practical artifact.",
      "Keep timezone coverage honest instead of overpromising availability.",
    ],
    nextAction: "Prepare a concise follow-up note with one artifact link and a clear value proposition.",
  },
  {
    id: "role-ai-frontend-systems",
    company: "StudioStack",
    role: "Frontend Systems Engineer, AI Products",
    fitScore: 77,
    location: "Remote · Contract-to-hire",
    stage: "Follow-up",
    priority: "P3",
    deadline: "Check next week",
    whyItFits:
      "Frontend systems match is solid, but the contract-to-hire path is lower priority than full-time remote roles.",
    tailoredAngles: [
      "Feature fast design-to-product integration work.",
      "Show typed UI state and verification discipline.",
      "Ask early about conversion timeline and expected weekly overlap.",
    ],
    nextAction: "Keep warm, but do not let it displace stronger P1 applications.",
  },
];

export const applicationStages: ApplicationStage[] = [
  {
    id: "stage-shortlist",
    title: "Shortlist",
    detail: "Roles worth scoring before Rex spends tailoring energy.",
    roleIds: ["role-product-engineer-ai"],
  },
  {
    id: "stage-tailoring",
    title: "Tailoring",
    detail: "High-fit roles that need a specific angle and proof point before sending.",
    roleIds: ["role-ai-fullstack-platform"],
  },
  {
    id: "stage-applied",
    title: "Applied",
    detail: "Sent applications waiting for response or scheduled follow-up.",
    roleIds: ["role-agent-platform"],
  },
  {
    id: "stage-follow-up",
    title: "Follow-up",
    detail: "Warm leads where a short, useful nudge is the next move.",
    roleIds: ["role-ai-frontend-systems"],
  },
];

export const jobHuntOutputs: JobHuntOutput[] = [
  {
    id: "job-output-daily",
    cadence: "Daily",
    label: "Daily shortlist sweep",
    state: "Ready",
    detail: "Convert new remote AI/full-stack leads into a scored shortlist with skip reasons.",
  },
  {
    id: "job-output-weekly",
    cadence: "Weekly",
    label: "Monday application review",
    state: "Due",
    detail: "Pick the best two roles, tailor the angle, and send before the day fragments.",
  },
  {
    id: "job-output-quality",
    cadence: "Daily",
    label: "Quality guardrail",
    state: "Watch",
    detail: "Flag weak matches early so the pipeline stays focused on high-signal roles.",
  },
];

export const contentIdeas: ContentIdea[] = [
  {
    id: "idea-agent-os-walkthrough",
    title: "Building my personal Agent OS",
    pillar: "Prompt to Code",
    stage: "Script",
    format: "Long-form",
    hook: "I stopped treating AI agents like chatbots and started building them an operating system.",
    nextAction: "Turn the Mission Control Phase 3 PR into a 7-minute walkthrough outline.",
  },
  {
    id: "idea-codex-thor-debug",
    title: "What broke when my coding agent lost the task",
    pillar: "AI Native Engineering",
    stage: "Idea",
    format: "Short",
    hook: "The model was fine. The task delivery layer was the bug.",
    nextAction: "Capture the lesson as a 45-second engineering story without exposing private config.",
  },
  {
    id: "idea-founder-weekly-reset",
    title: "Founder weekly reset with AI operators",
    pillar: "Founder Ops",
    stage: "Shoot",
    format: "Short",
    hook: "A weekly reset is easier when your dashboard already knows what is blocked.",
    nextAction: "Shoot the opening and one screen-recording segment after the Job Hunt module lands.",
  },
  {
    id: "idea-birthday-creative-bts",
    title: "Birthday shoot planning behind the scenes",
    pillar: "Personal",
    stage: "Edit",
    format: "Carousel",
    hook: "Turning a birthday idea into an actual production plan takes less chaos than you think.",
    nextAction: "Pair the gallery decision with a simple shot-list carousel draft.",
  },
  {
    id: "idea-remote-role-positioning",
    title: "How I position as an AI Native Fullstack Engineer",
    pillar: "AI Native Engineering",
    stage: "Publish",
    format: "Short",
    hook: "Your portfolio should show how you work, not just what stack you know.",
    nextAction: "Schedule after the next two applications are sent.",
  },
];

export const contentCalendar: ContentCalendarItem[] = [
  {
    id: "content-calendar-agent-os",
    date: "Mon",
    title: "Agent OS walkthrough outline",
    channel: "YouTube + LinkedIn",
    state: "Planned",
  },
  {
    id: "content-calendar-founder-reset",
    date: "Wed",
    title: "Founder weekly reset short",
    channel: "Shorts + TikTok",
    state: "Shoot ready",
  },
  {
    id: "content-calendar-positioning",
    date: "Fri",
    title: "AI Native Fullstack positioning clip",
    channel: "LinkedIn",
    state: "Scheduled",
  },
];

export const productionStages: ProductionStage[] = [
  {
    id: "content-stage-idea",
    title: "Idea backlog",
    detail: "Promising hooks that still need a point of view.",
    ideaIds: ["idea-codex-thor-debug"],
  },
  {
    id: "content-stage-script",
    title: "Script",
    detail: "Ideas with a clear argument that need structure before recording.",
    ideaIds: ["idea-agent-os-walkthrough"],
  },
  {
    id: "content-stage-shoot",
    title: "Shoot",
    detail: "Ready to capture once time, shot list, and setup are locked.",
    ideaIds: ["idea-founder-weekly-reset"],
  },
  {
    id: "content-stage-publish",
    title: "Edit / Publish",
    detail: "Assets moving through the final production and release queue.",
    ideaIds: ["idea-birthday-creative-bts", "idea-remote-role-positioning"],
  },
];

export const approvalItems: ApprovalItem[] = [
  {
    id: "approval-telegram-noise",
    title: "Stale Telegram approval prompts",
    severity: "Medium",
    source: "OpenClaw cron maintenance",
    action: "Track and eliminate approval-oriented execution regressions.",
  },
  {
    id: "approval-bootstrap",
    title: "Mission Control dependency install",
    severity: "Low",
    source: "Local app bootstrap",
    action: "Install dependencies before first runtime verification.",
  },
];

export const alerts: AlertItem[] = [
  {
    id: "alert-memory-cleanup",
    type: "Signal",
    title: "Daily memory cleanup completed",
    body: "Cron is healthy. Approval noise is a workflow bug, not a stuck task.",
  },
  {
    id: "alert-repo-scaffolded",
    type: "Build",
    title: "Mission Control repo scaffolded",
    body: "Architecture, phase roadmap, and product shell are now in repo.",
  },
];

export const chatThreads: ChatThread[] = [
  {
    id: "thread-phase-one",
    title: "Ship Mission Control Phase 2",
    summary: "Projects and Calendar are now the active product-delivery lane.",
    status: "Active",
  },
  {
    id: "thread-birthday-content",
    title: "Birthday content planning",
    summary: "Need gallery confirmation, concept, and timeline before May 8.",
    status: "Queued",
  },
  {
    id: "thread-role-hunt-standard",
    title: "Weekly role-hunt standard",
    summary: "Polished email template locked in as default for job-hunt sends.",
    status: "Stable",
  },
];

export const quickActions = [
  "Summarize what matters today",
  "Open the Agent OS operations view",
  "Show me blockers across active work",
  "Show this week's prep-needed meetings",
  "Draft a booking message for the gallery",
  "Prepare Monday job-hunt review checklist",
];

export function getActiveModule(pathname: string): ModuleKey {
  if (pathname === "/agent-os") return "agent-os";
  if (pathname === "/approvals") return "approvals";
  if (pathname === "/chat") return "chat";
  if (pathname === "/projects") return "projects";
  if (pathname === "/calendar") return "calendar";
  if (pathname === "/job-hunt") return "job-hunt";
  if (pathname === "/content") return "content";
  return "today";
}

export function getProjectHref(projectId: ProjectRecord["id"]) {
  return `/projects?project=${projectId}`;
}

export function getCalendarEventHref(eventId: CalendarEvent["id"]) {
  const event = calendarEvents.find((item) => item.id === eventId);

  if (!event) {
    return "/calendar";
  }

  return `/calendar?day=${event.dayId}&event=${event.id}`;
}
