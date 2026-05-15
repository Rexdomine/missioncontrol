"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  SdfAgentLane,
  SdfFactoryMode,
  SdfPhaseTask,
  SdfPipelineStage,
  SdfQualityGate,
  SdfRexInput,
} from "./mission-control-data";
import { SectionHeader } from "./mission-control-sections";

type FactoryModeName = SdfFactoryMode["name"];

type BuildIntake = {
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

type FactoryRunState = "Draft" | "Ready to launch" | "Running" | "Blocked" | "Review ready" | "PR open" | "Done";
type GeneratedTaskStatus = "Ready" | "Input needed" | "Queued" | "Gate pending" | "Running" | "Done";
type TimelineStatus = "Planned" | "Active" | "Blocked" | "Complete" | "Review";
type CheckStatus = "Simulated" | "Pending" | "Passing" | "Failing" | "Not connected";
type ReviewState = "Not requested" | "Needs Rex" | "Changes requested" | "Approved";

type GeneratedTask = {
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

type ExecutionEvent = {
  id: string;
  label: string;
  actor: string;
  status: TimelineStatus;
  detail: string;
  timestamp: string;
};

type PullRequestCheckpoint = {
  prUrl: string;
  branch: string;
  commit: string;
  checkStatus: CheckStatus;
  reviewState: ReviewState;
  risks: string[];
  blockers: string[];
  nextAction: string;
  liveSync: boolean;
};

type FactoryRun = {
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
};

type ReviewCheckpoint = {
  label: string;
  state: "Ready" | "Needs input" | "Blocked" | "Review";
  detail: string;
};

const STORAGE_KEY = "mission-control:sdf:factory-runs:v1";

const defaultIntake: BuildIntake = {
  appName: "Mission Control SDF Phase 3",
  productGoal:
    "Turn the SDF planning surface into a saved factory-run control layer with launch readiness, Thor/helper task packets, execution timeline, and PR checkpoints.",
  mode: "Factory",
  appType: "Next.js product dashboard",
  repoDetails: "missioncontrol · /sdf route · fresh branch from origin/main",
  designAssets:
    "Use the existing Mission Control warm dashboard system; attach screenshots, copy docs, Figma links, or HTML exports when available.",
  requiredFeatures:
    "Saved run registry, selected run detail view, readiness checklist, task packets, execution timeline, PR/checkpoint tracker, Rex approval gates.",
  constraints:
    "No unsafe external actions from the web app. Live agent spawning and GitHub sync stay gated until a safe backend integration exists.",
  rexProvides:
    "Approval to launch, priority lane, final acceptance criteria, permission before live external actions, review decision on the PR checkpoint.",
};

const appTypeTemplates = [
  "Next.js product dashboard",
  "Marketing/landing page",
  "Internal admin tool",
  "SaaS app workflow",
  "API-backed feature",
];

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
    phase: "02 · Design and UX plan",
    title: "Translate frontend assets into implementation-ready UI requirements",
    owner: "Frontend Builder",
    dependencies: ["Design notes/assets", "App type/template"],
    acceptance: ["Responsive states are named", "Empty/loading/error states are covered", "Accessibility labels are planned"],
    qualityGates: ["Implementation", "Integration"],
    checkpoint: "Design intake confirms what Thor should build first.",
  },
  {
    phase: "03 · Architecture and data model",
    title: "Define typed seams before implementation",
    owner: "Backend Builder",
    dependencies: ["Required phases/features", "Constraints/risks"],
    acceptance: ["Source of truth is clear", "Persistence seam is future-safe", "No speculative backend is required"],
    qualityGates: ["Self-check", "Review"],
    checkpoint: "Persistence and orchestration extension points are documented without overbuilding.",
  },
  {
    phase: "04 · Build slice",
    title: "Implement the smallest reviewable product surface",
    owner: "Thor Lead Engineer",
    dependencies: ["Approved task graph", "Lane assignments"],
    acceptance: ["Route works locally", "Navigation remains intact", "Copy explains current limitations"],
    qualityGates: ["Implementation", "Verification"],
    checkpoint: "Working branch is ready for QA and reviewer pass.",
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

function statusTone(status: string) {
  if (["Blocked", "Guarded", "Waiting", "Input needed", "Failing", "Changes requested", "Not connected"].includes(status)) return "risk";
  if (["Active", "In progress", "Recommended", "Lead", "Ready", "Running", "Passing", "Approved", "Done", "Complete"].includes(status)) return "active";
  return "warning";
}

function splitItems(value: string) {
  return value
    .split(/\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function nowIso() {
  return new Date().toISOString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function generateTaskGraph(intake: BuildIntake): GeneratedTask[] {
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
      dependencies: [
        ...phase.dependencies,
        dependencyFeature ? `Feature focus: ${dependencyFeature}` : `Template: ${intake.appType}`,
      ],
      acceptance: [
        ...phase.acceptance,
        intake.mode === "Autopilot" ? "Approval boundaries are explicit before execution" : `${intake.mode} mode responsibilities are clear`,
      ],
      rexInputPoint: rexInput || "Confirm scope and review checkpoint before expansion.",
      verificationCommands: index === 4 ? ["npm run lint", "npm run typecheck", "npm run build", "git diff --check"] : ["self-check", "acceptance review"],
    };
  });
}

function buildReadiness(intake: BuildIntake) {
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

function buildTimeline(tasks: GeneratedTask[]): ExecutionEvent[] {
  return tasks.map((task, index) => ({
    id: `timeline-${task.id}`,
    label: task.phase,
    actor: task.owner,
    status: index === 0 ? "Active" : task.status === "Input needed" ? "Blocked" : "Planned",
    detail: task.checkpoint,
    timestamp: nowIso(),
  }));
}

function buildPrCheckpoint(intake: BuildIntake): PullRequestCheckpoint {
  const branchSlug = intake.appName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "factory-run";
  return {
    prUrl: "",
    branch: `feat/${branchSlug}`,
    commit: "pending",
    checkStatus: "Simulated",
    reviewState: "Needs Rex",
    risks: splitItems(intake.constraints).slice(0, 3),
    blockers: buildReadiness(intake).filter((item) => !item.complete).map((item) => item.label),
    nextAction: "Rex reviews the generated packet, then Thor opens a real branch/PR outside the web app.",
    liveSync: false,
  };
}

function createRun(intake: BuildIntake, state: FactoryRunState = "Draft"): FactoryRun {
  const tasks = generateTaskGraph(intake);
  const createdAt = nowIso();
  return {
    id: `run-${Date.now()}`,
    title: intake.appName || "Untitled factory run",
    state,
    createdAt,
    updatedAt: createdAt,
    intake,
    tasks,
    timeline: buildTimeline(tasks),
    prCheckpoint: buildPrCheckpoint(intake),
    readiness: buildReadiness(intake),
  };
}

function createSeedRuns(): FactoryRun[] {
  const readyRun = createRun(defaultIntake, "Ready to launch");
  return [
    {
      ...readyRun,
      id: "seed-sdf-phase3",
      createdAt: "2026-05-15T07:00:00.000Z",
      updatedAt: "2026-05-15T07:00:00.000Z",
      prCheckpoint: {
        ...readyRun.prCheckpoint,
        branch: "feat/sdf-phase3-factory-runs",
        checkStatus: "Simulated",
        reviewState: "Needs Rex",
        nextAction: "Copy the Thor task packet after Rex confirms launch readiness.",
      },
    },
  ];
}

function loadRuns(): FactoryRun[] {
  if (typeof window === "undefined") return createSeedRuns();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedRuns();
    const parsed = JSON.parse(raw) as FactoryRun[];
    return Array.isArray(parsed) && parsed.length ? parsed : createSeedRuns();
  } catch {
    return createSeedRuns();
  }
}

function buildReviewCheckpoints(intake: BuildIntake, tasks: GeneratedTask[]): ReviewCheckpoint[] {
  const readiness = buildReadiness(intake);
  const incomplete = readiness.filter((item) => !item.complete).length;
  const blockedTasks = tasks.filter((task) => task.status === "Input needed").length;

  return [
    {
      label: "Run readiness",
      state: incomplete ? "Needs input" : "Ready",
      detail: incomplete ? `${incomplete} launch checklist item${incomplete > 1 ? "s" : ""} still need attention.` : "The run can be marked ready to launch after Rex review.",
    },
    {
      label: "Execution safety",
      state: "Review",
      detail: "The web app prepares task packets only. Real agent spawning and GitHub writes require an approved backend integration.",
    },
    {
      label: "Blocked",
      state: blockedTasks ? "Blocked" : "Ready",
      detail: blockedTasks ? `${blockedTasks} generated task needs input before launch.` : "No hard blocker in the saved local run model.",
    },
    {
      label: "Approval/review",
      state: intake.mode === "Autopilot" ? "Review" : "Ready",
      detail: "Rex approval remains the gate before any external action, branch push, PR open, or live helper-agent launch.",
    },
  ];
}

function buildTaskPacket(run: FactoryRun) {
  const taskLines = run.tasks
    .map(
      (task) => `### ${task.phase} — ${task.title}\nOwner/lane: ${task.owner}\nStatus: ${task.status}\nDependencies:\n${task.dependencies.map((item) => `- ${item}`).join("\n")}\nAcceptance criteria:\n${task.acceptance.map((item) => `- ${item}`).join("\n")}\nVerification: ${task.verificationCommands.join(" · ")}\nRex input: ${task.rexInputPoint}\nExpected checkpoint: ${task.checkpoint}`,
    )
    .join("\n\n");

  return `You are Thor/helper agent executing a Mission Control SDF factory run.\n\nRun: ${run.title}\nState: ${run.state}\nMode: ${run.intake.mode}\nRepo/source: ${run.intake.repoDetails}\nProduct goal: ${run.intake.productGoal}\n\nGlobal constraints:\n- Do not perform external writes without Rex approval.\n- Keep changes reviewable and open a PR instead of merging.\n- Report branch, commit, verification, blockers, and PR/checkpoint state.\n\n${taskLines}\n\nPR/checkpoint output expected:\n- Branch: ${run.prCheckpoint.branch}\n- PR URL: ${run.prCheckpoint.prUrl || "pending"}\n- Commit: ${run.prCheckpoint.commit}\n- Checks: ${run.prCheckpoint.checkStatus}\n- Review state: ${run.prCheckpoint.reviewState}\n- Next action: ${run.prCheckpoint.nextAction}`;
}

function FieldGroup({
  id,
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  id: keyof BuildIntake;
  label: string;
  value: string;
  onChange: (field: keyof BuildIntake, value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="sdf-field" htmlFor={`sdf-${id}`}>
      <span>{label}</span>
      {multiline ? (
        <textarea id={`sdf-${id}`} onChange={(event) => onChange(id, event.target.value)} placeholder={placeholder} rows={4} value={value} />
      ) : (
        <input id={`sdf-${id}`} onChange={(event) => onChange(id, event.target.value)} placeholder={placeholder} value={value} />
      )}
    </label>
  );
}

function LocalPersistenceNotice() {
  return (
    <div className="sdf-notice" role="note">
      <strong>Safe Phase 3 adapter:</strong> runs are saved in this browser with a typed localStorage adapter. Live database persistence, GitHub sync, and app-to-agent launch are intentionally gated extension points.
    </div>
  );
}

export function SoftwareDevelopmentFactoryModule({
  modes,
  pipeline,
  tasks,
  agents,
  gates,
  rexInputs,
}: {
  modes: SdfFactoryMode[];
  pipeline: SdfPipelineStage[];
  tasks: SdfPhaseTask[];
  agents: SdfAgentLane[];
  gates: SdfQualityGate[];
  rexInputs: SdfRexInput[];
}) {
  const [intake, setIntake] = useState<BuildIntake>(defaultIntake);
  const [runs, setRuns] = useState<FactoryRun[]>(createSeedRuns);
  const [selectedRunId, setSelectedRunId] = useState("seed-sdf-phase3");
  const [copied, setCopied] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const loaded = loadRuns();
    setRuns(loaded);
    setSelectedRunId(loaded[0]?.id ?? "seed-sdf-phase3");
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (storageReady && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
    }
  }, [runs, storageReady]);

  const generatedTasks = useMemo(() => generateTaskGraph(intake), [intake]);
  const reviewCheckpoints = useMemo(() => buildReviewCheckpoints(intake, generatedTasks), [generatedTasks, intake]);
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? runs[0];
  const taskPacket = selectedRun ? buildTaskPacket(selectedRun) : "";
  const readyRuns = runs.filter((run) => run.state === "Ready to launch" || run.state === "Running" || run.state === "PR open").length;
  const blockedRuns = runs.filter((run) => run.state === "Blocked" || run.readiness.some((item) => !item.complete)).length;
  const requiredGates = gates.filter((gate) => gate.status === "Required").length;

  function updateIntake(field: keyof BuildIntake, value: string) {
    setIntake((current) => ({ ...current, [field]: value }));
  }

  function saveDraftRun() {
    const run = createRun(intake, buildReadiness(intake).every((item) => item.complete) ? "Ready to launch" : "Draft");
    setRuns((current) => [run, ...current]);
    setSelectedRunId(run.id);
  }

  function updateRunState(id: string, state: FactoryRunState) {
    setRuns((current) =>
      current.map((run) =>
        run.id === id
          ? {
              ...run,
              state,
              updatedAt: nowIso(),
              timeline: run.timeline.map((event, index) => ({
                ...event,
                status: state === "Done" ? "Complete" : state === "Blocked" && index === 0 ? "Blocked" : state === "Running" && index <= 1 ? "Active" : event.status,
              })),
              prCheckpoint: {
                ...run.prCheckpoint,
                checkStatus: state === "PR open" ? "Pending" : state === "Done" ? "Passing" : run.prCheckpoint.checkStatus,
                reviewState: state === "Review ready" || state === "PR open" ? "Needs Rex" : state === "Done" ? "Approved" : run.prCheckpoint.reviewState,
              },
            }
          : run,
      ),
    );
  }

  async function copyPacket() {
    if (!taskPacket || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(taskPacket);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="content-grid sdf-grid">
      <div className="primary-column">
        <article className="panel-card accent-card sdf-intro-panel">
          <SectionHeader
            detail="Phase 3 turns SDF into a saved run registry and execution control surface. It prepares real task packets and checkpoints while keeping live external actions gated for Rex approval."
            eyebrow="Phase 3 · Factory run control layer"
            title="Launch and track development factory runs safely."
          />
          <div className="sdf-model-grid">
            <div><span>1</span><h3>Save runs</h3><p>Create persistent local factory runs with readiness, state, and selected-run detail.</p></div>
            <div><span>2</span><h3>Prepare packets</h3><p>Generate Thor/helper instructions with lanes, dependencies, acceptance criteria, and verification.</p></div>
            <div><span>3</span><h3>Track checkpoints</h3><p>Follow execution timeline, PR branch/commit/check state, blockers, and Rex review gates.</p></div>
          </div>
          <LocalPersistenceNotice />
        </article>

        <article className="panel-card sdf-intake-card" aria-labelledby="new-factory-run-heading">
          <SectionHeader
            detail="Saving creates a run in the registry below. The app prepares launch materials, but it does not spawn agents or push branches from the browser."
            eyebrow="Create run"
            title="New factory run intake"
          />
          <h3 className="sr-only" id="new-factory-run-heading">New factory run intake fields</h3>
          <div className="sdf-intake-form">
            <FieldGroup id="appName" label="Project/app name" onChange={updateIntake} value={intake.appName} />
            <label className="sdf-field" htmlFor="sdf-mode"><span>Factory mode</span><select id="sdf-mode" onChange={(event) => updateIntake("mode", event.target.value as FactoryModeName)} value={intake.mode}>{modes.map((mode) => <option key={mode.id} value={mode.name}>{mode.name}</option>)}</select></label>
            <label className="sdf-field" htmlFor="sdf-appType"><span>App type/template</span><select id="sdf-appType" onChange={(event) => updateIntake("appType", event.target.value)} value={intake.appType}>{appTypeTemplates.map((template) => <option key={template} value={template}>{template}</option>)}</select></label>
            <FieldGroup id="repoDetails" label="Repo/source details" onChange={updateIntake} value={intake.repoDetails} />
            <FieldGroup id="productGoal" label="Product goal / brief" multiline onChange={updateIntake} value={intake.productGoal} />
            <FieldGroup id="designAssets" label="Design system or frontend asset notes/links" multiline onChange={updateIntake} value={intake.designAssets} />
            <FieldGroup id="requiredFeatures" label="Required phases/features" multiline onChange={updateIntake} value={intake.requiredFeatures} />
            <FieldGroup id="constraints" label="Constraints / risks" multiline onChange={updateIntake} value={intake.constraints} />
            <FieldGroup id="rexProvides" label="What Rex needs to provide/approve" multiline onChange={updateIntake} value={intake.rexProvides} />
          </div>
          <div className="sdf-run-summary" aria-live="polite">
            <div><strong>{runs.length}</strong><span>saved runs</span></div>
            <div><strong>{readyRuns}</strong><span>launch-ready/running</span></div>
            <div><strong>{blockedRuns}</strong><span>blocked or incomplete</span></div>
            <div><strong>{requiredGates}</strong><span>required gates</span></div>
          </div>
          <div className="sdf-actions"><button className="primary-action" onClick={saveDraftRun} type="button">Save factory run</button></div>
        </article>

        <article className="panel-card">
          <SectionHeader detail="Select a run to see launch readiness, generated task packets, execution timeline, and PR checkpoint status." eyebrow="Run registry" title="Saved factory runs" />
          <div className="sdf-run-registry">
            {runs.map((run) => (
              <button aria-pressed={selectedRun?.id === run.id} className={`sdf-run-row${selectedRun?.id === run.id ? " selected" : ""}`} key={run.id} onClick={() => setSelectedRunId(run.id)} type="button">
                <div><p className="project-priority">Updated {formatDate(run.updatedAt)} · {run.intake.mode}</p><h3>{run.title}</h3><p>{run.intake.productGoal}</p></div>
                <span className={`status-pill ${statusTone(run.state)}`}>{run.state}</span>
              </button>
            ))}
          </div>
        </article>

        {selectedRun ? (
          <article className="panel-card sdf-detail-card">
            <SectionHeader detail="This is the operational view Rex uses before a real Thor/helper launch." eyebrow="Selected run detail" title={selectedRun.title} />
            <div className="sdf-detail-toolbar" aria-label="Factory run state controls">
              {(["Draft", "Ready to launch", "Running", "Blocked", "Review ready", "PR open", "Done"] as FactoryRunState[]).map((state) => (
                <button className={selectedRun.state === state ? "selected" : ""} key={state} onClick={() => updateRunState(selectedRun.id, state)} type="button">{state}</button>
              ))}
            </div>
            <div className="sdf-detail-grid">
              <div>
                <h3>Launch readiness checklist</h3>
                <div className="sdf-checklist">
                  {selectedRun.readiness.map((item) => <div className="sdf-checklist-item" key={item.id}><span aria-hidden="true">{item.complete ? "✓" : "!"}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div></div>)}
                </div>
              </div>
              <div>
                <h3>Execution timeline</h3>
                <div className="sdf-timeline">
                  {selectedRun.timeline.map((event) => <div className="sdf-timeline-item" key={event.id}><span className={`status-pill ${statusTone(event.status)}`}>{event.status}</span><div><strong>{event.label}</strong><p>{event.actor} · {event.detail}</p></div></div>)}
                </div>
              </div>
            </div>
          </article>
        ) : null}

        {selectedRun ? (
          <article className="panel-card">
            <SectionHeader detail="Copy this packet into Thor/helper agent work. It includes lane assignment, acceptance criteria, dependencies, verification commands, PR output, and Rex input requirements." eyebrow="Agent orchestration hooks" title="Generated Thor/helper task packet" />
            <div className="sdf-packet-toolbar"><button className="primary-action" onClick={copyPacket} type="button">{copied ? "Copied" : "Copy task packet"}</button><span>Live launch is gated until a safe app-to-agent backend exists.</span></div>
            <pre className="sdf-task-packet">{taskPacket}</pre>
          </article>
        ) : null}

        {selectedRun ? (
          <article className="panel-card">
            <SectionHeader detail="These fields are modeled now with simulated state. Live GitHub sync is the next integration step once a safe backend token boundary exists." eyebrow="PR/checkpoint tracking" title="Branch, commit, checks, review, risks, and next action" />
            <div className="sdf-pr-grid">
              <div><span>PR URL</span><strong>{selectedRun.prCheckpoint.prUrl || "Pending manual PR"}</strong></div>
              <div><span>Branch</span><strong>{selectedRun.prCheckpoint.branch}</strong></div>
              <div><span>Commit</span><strong>{selectedRun.prCheckpoint.commit}</strong></div>
              <div><span>Check status</span><strong>{selectedRun.prCheckpoint.checkStatus}</strong></div>
              <div><span>Review state</span><strong>{selectedRun.prCheckpoint.reviewState}</strong></div>
              <div><span>Live sync</span><strong>{selectedRun.prCheckpoint.liveSync ? "Connected" : "Not connected"}</strong></div>
            </div>
            <div className="sdf-task-body-grid">
              <div><h4>Risks/blockers</h4><ul className="detail-list compact-list">{[...selectedRun.prCheckpoint.risks, ...selectedRun.prCheckpoint.blockers].map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div><h4>Next action</h4><p>{selectedRun.prCheckpoint.nextAction}</p></div>
            </div>
          </article>
        ) : null}

        <article className="panel-card">
          <SectionHeader detail="Generated from the intake fields above. This remains the current-run preview before saving." eyebrow="Task graph preview" title="Phases, dependencies, acceptance criteria, and checkpoints" />
          <div className="sdf-generated-graph">
            {generatedTasks.map((task, index) => (
              <div className="sdf-generated-task" key={task.id}>
                <div className="pipeline-headline"><div><p className="project-priority">{task.phase} · {task.owner}</p><h3>{task.title}</h3></div><span className={`status-pill ${statusTone(task.status)}`}>{task.status}</span></div>
                <div className="sdf-task-body-grid"><div><h4>Dependencies</h4><ul className="detail-list compact-list">{task.dependencies.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h4>Acceptance criteria</h4><ul className="detail-list compact-list">{task.acceptance.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
                <div className="sdf-task-footer"><span>Gates: {task.qualityGates.join(" · ")}</span><span>Verification: {task.verificationCommands.join(" · ")}</span><span>Rex input: {task.rexInputPoint}</span><span>PR/checkpoint: {index === generatedTasks.length - 1 ? "Fresh PR into main, no merge" : task.checkpoint}</span></div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="secondary-column">
        <article className="panel-card control-panel"><SectionHeader detail="Factory mode changes how much Rex steers, not whether Thor still verifies and opens a PR." eyebrow="Factory mode" title="Control level" /><div className="sdf-mode-stack">{modes.map((mode) => <button aria-pressed={intake.mode === mode.name} className={`sdf-mode-select${intake.mode === mode.name ? " selected" : ""}`} key={mode.id} onClick={() => updateIntake("mode", mode.name)} type="button"><div className="control-card-head"><strong>{mode.name}</strong><span className={`status-pill ${statusTone(mode.state)}`}>{mode.state}</span></div><p>{mode.bestFor}</p></button>)}</div></article>
        <article className="panel-card"><SectionHeader detail="Lane ownership is explicit before Thor asks any helper agent to build." eyebrow="Helper-agent assignment board" title="Factory lanes" /><div className="sdf-agent-board">{agents.map((agent) => <div className="sdf-agent-card" key={agent.id}><div className="skill-topline"><div><p className="project-priority">{agent.role}</p><h3>{agent.name}</h3></div><span className={`status-pill ${statusTone(agent.state)}`}>{agent.state}</span></div><p>{agent.handoff}</p></div>)}</div></article>
        <article className="panel-card accent-card"><SectionHeader detail="Rex should see the decision surface before live work starts." eyebrow="Rex checkpoint" title="Ready, needs input, blocked, approval" /><div className="sdf-checkpoint-list">{reviewCheckpoints.map((checkpoint) => <div className="sdf-checkpoint-card" key={checkpoint.label}><div className="control-card-head"><h3>{checkpoint.label}</h3><span className={`status-pill ${statusTone(checkpoint.state)}`}>{checkpoint.state}</span></div><p>{checkpoint.detail}</p></div>)}</div></article>
        <article className="panel-card control-panel"><SectionHeader detail="Every factory run should show what evidence exists before it asks Rex to trust the output." eyebrow="Quality gates" title="Checkpoint standards" /><div className="control-grid">{gates.map((gate) => <div className="control-card" key={gate.id}><div className="control-card-head"><h3>{gate.label}</h3><span className={`status-pill ${statusTone(gate.status)}`}>{gate.status}</span></div><p>{gate.evidence}</p></div>)}</div></article>
        <article className="panel-card"><SectionHeader detail="The seeded SDF foundation remains visible so Rex can see how Phase 3 maps onto the factory model." eyebrow="Foundation pipeline" title="Factory stages already defined" /><div className="sdf-pipeline-rail">{pipeline.map((stage, index) => <div className="pipeline-step" key={stage.id}><span className="pipeline-index">{index + 1}</span><div><div className="pipeline-headline"><h3>{stage.label}</h3><span className={`status-pill ${statusTone(stage.status)}`}>{stage.status}</span></div><p>{stage.detail}</p><div className="thread-meta">Owner: {stage.owner}</div></div></div>)}</div></article>
        <article className="panel-card"><SectionHeader detail="Seeded outputs keep the older SDF concept visible while Phase 3 adds saved operational runs." eyebrow="Seeded outputs" title="Existing phase tasks and Rex input queue" /><div className="sdf-task-list compact-sdf-list">{tasks.map((task) => <div className="ops-task-card" key={task.id}><div className="ops-task-topline"><div><p className="project-priority">{task.phase} · {task.owner}</p><h3>{task.title}</h3></div><span className={`status-pill ${statusTone(task.status)}`}>{task.status}</span></div></div>)}</div><div className="dispatch-list sdf-rex-input-list">{rexInputs.map((item) => <div className="dispatch-card" key={item.id}><p className="project-priority">{item.priority} · {item.neededFor}</p><h3>{item.title}</h3><p>{item.prompt}</p></div>)}</div></article>
        <article className="panel-card sdf-readiness-card"><p className="eyebrow">Phase 4 live integrations</p><h2>Wire persistence, GitHub, and agent launch behind approved backends.</h2><p>Phase 3 deliberately models the operating layer first. Next: database-backed runs, GitHub check sync, and safe server-side launch workflows with Rex approval logging.</p></article>
      </div>
    </section>
  );
}
