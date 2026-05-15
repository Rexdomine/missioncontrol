import type {
  SdfAgentLane,
  SdfFactoryMode,
  SdfPhaseTask,
  SdfPipelineStage,
  SdfQualityGate,
  SdfRexInput,
} from "./mission-control-data";
import { SectionHeader } from "./mission-control-sections";

function gateTone(status: SdfQualityGate["status"] | SdfPipelineStage["status"] | SdfFactoryMode["state"] | SdfPhaseTask["status"] | SdfAgentLane["state"]) {
  if (status === "Blocked" || status === "Guarded" || status === "Waiting") return "risk";
  if (status === "Active" || status === "In progress" || status === "Recommended" || status === "Lead") return "active";
  if (status === "Next" || status === "Queued" || status === "Review") return "warning";
  return "active";
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
  const readyGates = gates.filter((gate) => gate.status === "Satisfied").length;
  const requiredGates = gates.filter((gate) => gate.status === "Required").length;

  return (
    <section className="content-grid sdf-grid">
      <div className="primary-column">
        <article className="panel-card accent-card sdf-intro-panel">
          <SectionHeader
            detail="This foundation phase makes the factory model visible before live task creation and design intake are wired in."
            eyebrow="Factory model"
            title="From product idea to review-ready PR, with checkpoints Rex can trust."
          />
          <div className="sdf-model-grid">
            <div>
              <span>1</span>
              <h3>Project intake</h3>
              <p>Capture the goal, constraints, repo, risk, design assets, and exact Rex decisions needed before build work starts.</p>
            </div>
            <div>
              <span>2</span>
              <h3>Task graph</h3>
              <p>Break the outcome into phases, helper-agent lanes, implementation seams, quality gates, and checkpoint outputs.</p>
            </div>
            <div>
              <span>3</span>
              <h3>Review loop</h3>
              <p>Ship through lint, typecheck, build, smoke, PR, and Rex review instead of relying on chat-only completion.</p>
            </div>
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="Rex can choose how much control to keep for each build without changing the safety standard."
            eyebrow="Factory modes"
            title="Assisted, Factory, and Autopilot execution."
          />
          <div className="sdf-mode-grid">
            {modes.map((mode) => (
              <div className="sdf-mode-card" key={mode.id}>
                <div className="control-card-head">
                  <div>
                    <p className="project-priority">{mode.bestFor}</p>
                    <h3>{mode.name}</h3>
                  </div>
                  <span className={`status-pill ${gateTone(mode.state)}`}>{mode.state}</span>
                </div>
                <div className="sdf-two-row">
                  <div>
                    <span>Rex role</span>
                    <p>{mode.rexRole}</p>
                  </div>
                  <div>
                    <span>Agent behavior</span>
                    <p>{mode.agentBehavior}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="The seeded graph shows how the next functional phase can transform a brief into assigned work."
            eyebrow="Phase breakdown"
            title="Active build pipeline and task graph."
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
          <div className="sdf-task-list">
            {tasks.map((task) => (
              <div className="ops-task-card" key={task.id}>
                <div className="ops-task-topline">
                  <div>
                    <p className="project-priority">{task.phase} · {task.owner}</p>
                    <h3>{task.title}</h3>
                  </div>
                  <span className={`status-pill ${gateTone(task.status)}`}>{task.status}</span>
                </div>
                <ul className="detail-list compact-list">
                  {task.outputs.map((output) => <li key={output}>{output}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <SectionHeader
            detail="The next phase should turn this seeded map into real creation forms, assignment controls, and design intake."
            eyebrow="Roadmap"
            title="Foundation now, functional task creation next."
          />
          <div className="sdf-roadmap-card">
            <p>
              Phase 1 establishes the SDF navigation, route, language, data model, factory modes,
              helper lanes, and quality gates. Phase 2 should add a real build-intake flow: paste a
              brief, attach design inputs, choose mode, generate the task graph, assign helper lanes,
              and track PR/checkpoint readiness from live repo state.
            </p>
            <strong>{readyGates} gate satisfied · {requiredGates} required gates must pass before handoff</strong>
          </div>
        </article>
      </div>

      <div className="secondary-column">
        <article className="panel-card">
          <SectionHeader
            detail="Helper lanes make ownership explicit so parallel work stays coordinated instead of noisy."
            eyebrow="Helper agents"
            title="Factory lanes"
          />
          <div className="sdf-agent-list">
            {agents.map((agent) => (
              <div className="skill-card" key={agent.id}>
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

        <article className="panel-card accent-card">
          <SectionHeader
            detail="These are the current decisions that will unblock the next SDF phase."
            eyebrow="Rex input queue"
            title="Blockers and questions"
          />
          <div className="dispatch-list">
            {rexInputs.map((item) => (
              <div className="dispatch-card" key={item.id}>
                <div className="control-card-head">
                  <div>
                    <p className="project-priority">{item.priority} · {item.neededFor}</p>
                    <h3>{item.title}</h3>
                  </div>
                </div>
                <p>{item.prompt}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card sdf-readiness-card">
          <p className="eyebrow">PR/checkpoint readiness</p>
          <h2>Ready when the evidence packet is complete.</h2>
          <p>
            SDF work is not considered done until the branch is clean, verification passes,
            route smoke is captured, a fresh PR exists, and Rex has a clear approve/revise/hold choice.
          </p>
        </article>
      </div>
    </section>
  );
}
