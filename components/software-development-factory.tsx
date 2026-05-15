"use client";

import { useMemo, useState } from "react";
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

type GeneratedTaskStatus = "Ready" | "Input needed" | "Queued" | "Gate pending";

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
};

type ReviewCheckpoint = {
  label: string;
  state: "Ready" | "Needs input" | "Blocked" | "Review";
  detail: string;
};

const defaultIntake: BuildIntake = {
  appName: "Mission Control SDF intake",
  productGoal:
    "Let Rex create frontend/design build inputs and hand Thor a review-ready implementation packet.",
  mode: "Factory",
  appType: "Next.js product dashboard",
  repoDetails: "missioncontrol · /sdf route · fresh branch from origin/main",
  designAssets:
    "Use the existing Mission Control warm dashboard system; attach screenshots, copy docs, Figma links, or HTML exports when available.",
  requiredFeatures:
    "Intake form, generated phase/task graph, helper-agent assignment board, Rex checkpoint panel, PR expectations.",
  constraints:
    "Frontend/local-state only for Phase 2. No live multi-agent execution or backend persistence until Phase 3.",
  rexProvides:
    "Final product goal, design references, repo/source link if external, approval boundaries, and priority features.",
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
    checkpoint: "Phase 3 extension points are documented without overbuilding Phase 2.",
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

function gateTone(
  status:
    | SdfQualityGate["status"]
    | SdfPipelineStage["status"]
    | SdfFactoryMode["state"]
    | SdfPhaseTask["status"]
    | SdfAgentLane["state"]
    | GeneratedTaskStatus
    | ReviewCheckpoint["state"],
) {
  if (status === "Blocked" || status === "Guarded" || status === "Waiting" || status === "Input needed") return "risk";
  if (status === "Active" || status === "In progress" || status === "Recommended" || status === "Lead" || status === "Ready") return "active";
  if (status === "Next" || status === "Queued" || status === "Review" || status === "Gate pending" || status === "Needs input") return "warning";
  return "active";
}

function splitItems(value: string) {
  return value
    .split(/\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
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
      title:
        index === 0
          ? `Normalize ${intake.appName || "new build"} brief and source context`
          : phase.title,
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
    };
  });
}

function buildReviewCheckpoints(intake: BuildIntake, tasks: GeneratedTask[]): ReviewCheckpoint[] {
  const missingDesign = !intake.designAssets.trim();
  const missingRepo = !intake.repoDetails.trim();
  const blockedTasks = tasks.filter((task) => task.status === "Input needed").length;

  return [
    {
      label: "Ready now",
      state: missingRepo ? "Needs input" : "Ready",
      detail: missingRepo
        ? "Add repo/source details before Thor can safely create implementation work."
        : `${intake.appName || "This build"} has enough source context to create the first task packet.`,
    },
    {
      label: "Needs Rex input",
      state: missingDesign || blockedTasks ? "Needs input" : "Review",
      detail: missingDesign
        ? "Attach or describe the desired visual direction so the frontend lane can build confidently."
        : intake.rexProvides || "Rex should confirm priority features, approval boundaries, and review cadence.",
    },
    {
      label: "Blocked",
      state: blockedTasks ? "Blocked" : "Ready",
      detail: blockedTasks
        ? `${blockedTasks} generated task needs input before implementation should proceed.`
        : "No hard blocker in this local Phase 2 planning preview.",
    },
    {
      label: "Approval/review",
      state: intake.mode === "Autopilot" ? "Review" : "Ready",
      detail:
        intake.mode === "Autopilot"
          ? "Autopilot remains guarded: Rex approval is required before any live execution in Phase 3."
          : "Checkpoint packet should include changed files, route smoke, verification results, risks, and PR link.",
    },
  ];
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
        <textarea
          id={`sdf-${id}`}
          onChange={(event) => onChange(id, event.target.value)}
          placeholder={placeholder}
          rows={4}
          value={value}
        />
      ) : (
        <input
          id={`sdf-${id}`}
          onChange={(event) => onChange(id, event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      )}
    </label>
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
  const generatedTasks = useMemo(() => generateTaskGraph(intake), [intake]);
  const reviewCheckpoints = useMemo(() => buildReviewCheckpoints(intake, generatedTasks), [generatedTasks, intake]);
  const featureCount = splitItems(intake.requiredFeatures).length;
  const readyTasks = generatedTasks.filter((task) => task.status === "Ready").length;
  const requiredGates = gates.filter((gate) => gate.status === "Required").length;

  function updateIntake(field: keyof BuildIntake, value: string) {
    setIntake((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="content-grid sdf-grid">
      <div className="primary-column">
        <article className="panel-card accent-card sdf-intro-panel">
          <SectionHeader
            detail="Phase 2 makes the factory usable as a local planning/intake surface. It previews deterministic task creation now; live persistence and multi-agent execution are Phase 3 extension points."
            eyebrow="Phase 2 · Functional planning intake"
            title="Create a factory run before Thor starts building."
          />
          <div className="sdf-model-grid">
            <div>
              <span>1</span>
              <h3>Intake the build</h3>
              <p>Capture the app goal, source context, design assets, risks, and the exact inputs Rex still needs to provide.</p>
            </div>
            <div>
              <span>2</span>
              <h3>Preview the graph</h3>
              <p>Generate phases, tasks, dependencies, acceptance criteria, quality gates, Rex input points, and PR checkpoints.</p>
            </div>
            <div>
              <span>3</span>
              <h3>Assign helper lanes</h3>
              <p>Make Thor, frontend, backend, QA, reviewer, docs, and DevOps responsibilities explicit before execution begins.</p>
            </div>
          </div>
        </article>

        <article className="panel-card sdf-intake-card" aria-labelledby="new-factory-run-heading">
          <SectionHeader
            detail="This is local-state planning, not live orchestration. Resetting the page restores the seeded example."
            eyebrow="Create build"
            title="New factory run intake"
          />
          <h3 className="sr-only" id="new-factory-run-heading">New factory run intake fields</h3>
          <div className="sdf-intake-form">
            <FieldGroup id="appName" label="Project/app name" onChange={updateIntake} value={intake.appName} />
            <label className="sdf-field" htmlFor="sdf-mode">
              <span>Factory mode</span>
              <select
                id="sdf-mode"
                onChange={(event) => updateIntake("mode", event.target.value as FactoryModeName)}
                value={intake.mode}
              >
                {modes.map((mode) => (
                  <option key={mode.id} value={mode.name}>{mode.name}</option>
                ))}
              </select>
            </label>
            <label className="sdf-field" htmlFor="sdf-appType">
              <span>App type/template</span>
              <select
                id="sdf-appType"
                onChange={(event) => updateIntake("appType", event.target.value)}
                value={intake.appType}
              >
                {appTypeTemplates.map((template) => (
                  <option key={template} value={template}>{template}</option>
                ))}
              </select>
            </label>
            <FieldGroup id="repoDetails" label="Repo/source details" onChange={updateIntake} value={intake.repoDetails} />
            <FieldGroup id="productGoal" label="Product goal / brief" multiline onChange={updateIntake} value={intake.productGoal} />
            <FieldGroup id="designAssets" label="Design system or frontend asset notes/links" multiline onChange={updateIntake} value={intake.designAssets} />
            <FieldGroup id="requiredFeatures" label="Required phases/features" multiline onChange={updateIntake} value={intake.requiredFeatures} />
            <FieldGroup id="constraints" label="Constraints / risks" multiline onChange={updateIntake} value={intake.constraints} />
            <FieldGroup id="rexProvides" label="What Rex needs to provide" multiline onChange={updateIntake} value={intake.rexProvides} />
          </div>
          <div className="sdf-run-summary" aria-live="polite">
            <div><strong>{featureCount}</strong><span>feature inputs</span></div>
            <div><strong>{generatedTasks.length}</strong><span>generated tasks</span></div>
            <div><strong>{readyTasks}</strong><span>ready tasks</span></div>
            <div><strong>{requiredGates}</strong><span>required gates</span></div>
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="Generated from the intake fields above. Later this becomes the persisted orchestration graph for Phase 3."
            eyebrow="Task graph preview"
            title="Phases, dependencies, acceptance criteria, and checkpoints"
          />
          <div className="sdf-generated-graph">
            {generatedTasks.map((task, index) => (
              <div className="sdf-generated-task" key={task.id}>
                <div className="pipeline-headline">
                  <div>
                    <p className="project-priority">{task.phase} · {task.owner}</p>
                    <h3>{task.title}</h3>
                  </div>
                  <span className={`status-pill ${gateTone(task.status)}`}>{task.status}</span>
                </div>
                <div className="sdf-task-body-grid">
                  <div>
                    <h4>Dependencies</h4>
                    <ul className="detail-list compact-list">{task.dependencies.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div>
                    <h4>Acceptance criteria</h4>
                    <ul className="detail-list compact-list">{task.acceptance.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                </div>
                <div className="sdf-task-footer">
                  <span>Gates: {task.qualityGates.join(" · ")}</span>
                  <span>Rex input: {task.rexInputPoint}</span>
                  <span>PR/checkpoint: {index === generatedTasks.length - 1 ? "Fresh PR into main, no merge" : task.checkpoint}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="The seeded SDF foundation remains visible so Rex can see how Phase 2 maps onto the factory model."
            eyebrow="Foundation pipeline"
            title="Factory stages already defined"
          />
          <div className="sdf-pipeline-rail">
            {pipeline.map((stage, index) => (
              <div className="pipeline-step" key={stage.id}>
                <span className="pipeline-index">{index + 1}</span>
                <div>
                  <div className="pipeline-headline">
                    <h3>{stage.label}</h3>
                    <span className={`status-pill ${gateTone(stage.status)}`}>{stage.status}</span>
                  </div>
                  <p>{stage.detail}</p>
                  <div className="thread-meta">Owner: {stage.owner}</div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="secondary-column">
        <article className="panel-card control-panel">
          <SectionHeader
            detail="Factory mode changes how much Rex steers, not whether Thor still verifies and opens a PR."
            eyebrow="Factory mode"
            title="Control level"
          />
          <div className="sdf-mode-stack">
            {modes.map((mode) => (
              <button
                aria-pressed={intake.mode === mode.name}
                className={`sdf-mode-select${intake.mode === mode.name ? " selected" : ""}`}
                key={mode.id}
                onClick={() => updateIntake("mode", mode.name)}
                type="button"
              >
                <div className="control-card-head">
                  <strong>{mode.name}</strong>
                  <span className={`status-pill ${gateTone(mode.state)}`}>{mode.state}</span>
                </div>
                <p>{mode.bestFor}</p>
              </button>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="Lane ownership is explicit before Thor asks any helper agent to build."
            eyebrow="Helper-agent assignment board"
            title="Factory lanes"
          />
          <div className="sdf-agent-board">
            {agents.map((agent) => (
              <div className="sdf-agent-card" key={agent.id}>
                <div className="skill-topline">
                  <div>
                    <p className="project-priority">{agent.role}</p>
                    <h3>{agent.name}</h3>
                  </div>
                  <span className={`status-pill ${gateTone(agent.state)}`}>{agent.state}</span>
                </div>
                <p>{agent.handoff}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card accent-card">
          <SectionHeader
            detail="Rex should see the decision surface before live work starts."
            eyebrow="Rex checkpoint"
            title="Ready, needs input, blocked, approval"
          />
          <div className="sdf-checkpoint-list">
            {reviewCheckpoints.map((checkpoint) => (
              <div className="sdf-checkpoint-card" key={checkpoint.label}>
                <div className="control-card-head">
                  <h3>{checkpoint.label}</h3>
                  <span className={`status-pill ${gateTone(checkpoint.state)}`}>{checkpoint.state}</span>
                </div>
                <p>{checkpoint.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card control-panel">
          <SectionHeader
            detail="Every factory run should show what evidence exists before it asks Rex to trust the output."
            eyebrow="Quality gates"
            title="Checkpoint standards"
          />
          <div className="control-grid">
            {gates.map((gate) => (
              <div className="control-card" key={gate.id}>
                <div className="control-card-head">
                  <h3>{gate.label}</h3>
                  <span className={`status-pill ${gateTone(gate.status)}`}>{gate.status}</span>
                </div>
                <p>{gate.evidence}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="These seeded outputs keep the older SDF concept useful while Phase 2 adds live local planning."
            eyebrow="Seeded outputs"
            title="Existing phase tasks and Rex input queue"
          />
          <div className="sdf-task-list compact-sdf-list">
            {tasks.map((task) => (
              <div className="ops-task-card" key={task.id}>
                <div className="ops-task-topline">
                  <div>
                    <p className="project-priority">{task.phase} · {task.owner}</p>
                    <h3>{task.title}</h3>
                  </div>
                  <span className={`status-pill ${gateTone(task.status)}`}>{task.status}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="dispatch-list sdf-rex-input-list">
            {rexInputs.map((item) => (
              <div className="dispatch-card" key={item.id}>
                <p className="project-priority">{item.priority} · {item.neededFor}</p>
                <h3>{item.title}</h3>
                <p>{item.prompt}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card sdf-readiness-card">
          <p className="eyebrow">Phase 3 extension points</p>
          <h2>Persistence and orchestration come next.</h2>
          <p>
            Phase 2 intentionally stops at typed local state and deterministic graph generation. Phase 3 should persist runs, attach files/links, create real Thor tasks, track agent execution, and sync PR/check status from GitHub.
          </p>
        </article>
      </div>
    </section>
  );
}
