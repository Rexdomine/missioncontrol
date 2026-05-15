"use client";

import { useEffect, useMemo, useState } from "react";
import { appTypeTemplates, buildReadiness, buildTaskPacket, defaultIntake, generateTaskGraph } from "@/lib/sdf/factory";
import type { BuildIntake, DispatchAttempt, FactoryModeName, FactoryRun, FactoryRunState, OperatorBridgeAction, OperatorBridgeOutboxItem, SdfRunRegistryResponse } from "@/lib/sdf/types";
import type {
  SdfAgentLane,
  SdfFactoryMode,
  SdfPhaseTask,
  SdfPipelineStage,
  SdfQualityGate,
  SdfRexInput,
} from "./mission-control-data";
import { SectionHeader } from "./mission-control-sections";

const STORAGE_KEY = "mission-control:sdf:factory-runs:v1";

type ReviewCheckpoint = {
  label: string;
  state: "Ready" | "Needs input" | "Blocked" | "Review";
  detail: string;
};

function statusTone(status: string) {
  if (["Blocked", "Guarded", "Waiting", "Input needed", "Failing", "Changes requested", "Not connected", "rejected", "blocked", "cancelled", "failed"].includes(status)) return "risk";
  if (["Active", "In progress", "Recommended", "Lead", "Ready", "Running", "Passing", "Approved", "Done", "Complete", "approved", "prepared", "waiting-for-operator", "launched", "live", "queued", "dispatched-ready", "configured"].includes(status)) return "active";
  return "warning";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function loadLocalFallback(): FactoryRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FactoryRun[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildReviewCheckpoints(intake: BuildIntake, tasks: ReturnType<typeof generateTaskGraph>): ReviewCheckpoint[] {
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
      detail: "The web app prepares and records launch packets only. Phase 8 can prepare an OpenClaw/operator outbox packet, but it still does not spawn agents itself.",
    },
    {
      label: "Blocked",
      state: blockedTasks ? "Blocked" : "Ready",
      detail: blockedTasks ? `${blockedTasks} generated task needs input before launch.` : "No hard blocker in the API-backed run model.",
    },
    {
      label: "Approval/review",
      state: intake.mode === "Autopilot" ? "Review" : "Ready",
      detail: "Rex approval is logged before bridge preparation. GitHub writes, notifications, production writes, and live helper-agent spawning remain out of scope.",
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
        <textarea id={`sdf-${id}`} onChange={(event) => onChange(id, event.target.value)} placeholder={placeholder} rows={4} value={value} />
      ) : (
        <input id={`sdf-${id}`} onChange={(event) => onChange(id, event.target.value)} placeholder={placeholder} value={value} />
      )}
    </label>
  );
}

function IntegrationNotice({ adapter, error }: { adapter: SdfRunRegistryResponse["adapter"] | null; error: string }) {
  return (
    <div className="sdf-notice" role="note">
      <strong>Phase 8 OpenClaw/operator bridge:</strong> SDF reads and writes runs through typed API routes backed by a safe server file adapter ({adapter?.source ?? "loading"}), queues launch jobs idempotently behind approval policy, and now prepares only review-mode OpenClaw/operator outbox packets for StarLord/Thor. {error ? `Current API issue: ${error}` : "GitHub writes, notifications, production writes, shell commands, and web-app agent spawning remain disabled."}
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
  const [runs, setRuns] = useState<FactoryRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState("seed-sdf-phase4");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [adapter, setAdapter] = useState<SdfRunRegistryResponse["adapter"] | null>(null);
  const [dispatcher, setDispatcher] = useState<SdfRunRegistryResponse["dispatcher"] | null>(null);
  const [latestDispatch, setLatestDispatch] = useState<DispatchAttempt | null>(null);
  const [latestBridgeItem, setLatestBridgeItem] = useState<OperatorBridgeOutboxItem | null>(null);

  async function loadRuns() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/sdf/runs", { cache: "no-store" });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const data = (await response.json()) as SdfRunRegistryResponse;
      const nextRuns = data.runs.length ? data.runs : loadLocalFallback();
      setRuns(nextRuns);
      setAdapter(data.adapter);
      setDispatcher(data.dispatcher);
      setSelectedRunId((current) => (nextRuns.some((run) => run.id === current) ? current : nextRuns[0]?.id ?? ""));
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRuns));
    } catch (apiError) {
      const fallback = loadLocalFallback();
      setRuns(fallback);
      setSelectedRunId(fallback[0]?.id ?? "");
      setError(apiError instanceof Error ? apiError.message : "Unable to load SDF API registry");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRuns();
  }, []);

  const generatedTasks = useMemo(() => generateTaskGraph(intake), [intake]);
  const reviewCheckpoints = useMemo(() => buildReviewCheckpoints(intake, generatedTasks), [generatedTasks, intake]);
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? runs[0];
  const taskPacket = selectedRun ? buildTaskPacket(selectedRun) : "";
  const readyRuns = runs.filter((run) => run.state === "Ready to launch" || run.state === "Running" || run.state === "PR open").length;
  const blockedRuns = runs.filter((run) => run.state === "Blocked" || run.readiness.some((item) => !item.complete)).length;
  const requiredGates = gates.filter((gate) => gate.status === "Required").length;
  const latestLaunch = selectedRun?.launchRequests[0];
  const latestQueueJob = selectedRun?.launchQueue?.[0];
  const latestRecordedDispatch = selectedRun?.dispatchAttempts?.[0];
  const activeDispatch = latestDispatch ?? latestRecordedDispatch;
  const latestHandoff = latestQueueJob?.reviewHandoff ?? activeDispatch?.reviewHandoff;
  const activeBridgeItem = latestBridgeItem ?? selectedRun?.operatorBridgeOutbox?.[0] ?? null;

  function updateIntake(field: keyof BuildIntake, value: string) {
    setIntake((current) => ({ ...current, [field]: value }));
  }

  async function saveDraftRun() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/sdf/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(intake) });
      if (!response.ok) throw new Error(`Create failed with ${response.status}`);
      const run = (await response.json()) as FactoryRun;
      setRuns((current) => [run, ...current]);
      setSelectedRunId(run.id);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to save factory run");
    } finally {
      setSaving(false);
    }
  }

  async function patchSelectedRun(patch: unknown) {
    if (!selectedRun) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/sdf/runs/${selectedRun.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!response.ok) throw new Error(`Update failed with ${response.status}`);
      const updated = (await response.json()) as FactoryRun;
      setRuns((current) => current.map((run) => (run.id === updated.id ? updated : run)));
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to update factory run");
    } finally {
      setSaving(false);
    }
  }

  async function updateRunState(state: FactoryRunState) {
    await patchSelectedRun({ state });
  }

  async function syncCheckpoint(source: "manual" | "simulated" | "live") {
    if (!selectedRun) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/sdf/runs/${selectedRun.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          branch: selectedRun.prCheckpoint.branch,
          commit: selectedRun.prCheckpoint.commit === "pending" ? `manual-${Date.now().toString(36)}` : selectedRun.prCheckpoint.commit,
          checkStatus: source === "simulated" ? "Simulated" : "Pending",
          nextAction: source === "live" ? "Configure or verify GitHub credentials before trusting live status." : "Manual checkpoint recorded for Rex review.",
        }),
      });
      if (!response.ok) throw new Error(`Sync failed with ${response.status}`);
      const updated = (await response.json()) as FactoryRun;
      setRuns((current) => current.map((run) => (run.id === updated.id ? updated : run)));
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to sync checkpoint");
    } finally {
      setSaving(false);
    }
  }

  async function prepareLaunchRequest(approvalState: "requested" | "approved" = "requested") {
    if (!selectedRun) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/sdf/runs/${selectedRun.id}/launch-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalState, approvalNote: approvalState === "approved" ? "Rex approval recorded for Phase 8 review-mode OpenClaw/operator handoff only; no web-app agent spawn is allowed." : undefined }),
      });
      if (!response.ok) throw new Error(`Launch request failed with ${response.status}`);
      const updated = (await response.json()) as FactoryRun;
      setRuns((current) => current.map((run) => (run.id === updated.id ? updated : run)));
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to prepare launch request");
    } finally {
      setSaving(false);
    }
  }

  async function previewDispatch(mode: "dry-run" | "review" | "review-dispatch" | "operator-handoff" | "live" = "dry-run") {
    if (!selectedRun) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/sdf/runs/${selectedRun.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          dryRun: mode !== "live",
          reviewOnly: mode !== "live",
          intent: mode === "live" ? "live" : mode === "review-dispatch" || mode === "operator-handoff" ? mode : "preview",
          approvalIntent: mode === "review-dispatch" || mode === "operator-handoff" ? "rex-approved-review-dispatch" : undefined,
          jobId: latestQueueJob?.id,
        }),
      });
      const payload = (await response.json()) as { run?: FactoryRun; dispatch?: DispatchAttempt; error?: string };
      if (!response.ok && !payload.run) throw new Error(payload.error ?? `Dispatch preview failed with ${response.status}`);
      if (payload.run) setRuns((current) => current.map((run) => (run.id === payload.run?.id ? payload.run : run)));
      if (payload.dispatch) setLatestDispatch(payload.dispatch);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to preview dispatch");
    } finally {
      setSaving(false);
    }
  }

  async function updateOperatorBridge(action: OperatorBridgeAction, options: { operator?: string; note?: string; blockedReason?: string } = {}) {
    if (!selectedRun) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/sdf/runs/${selectedRun.id}/operator-bridge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          approvalIntent: action === "prepare" ? "rex-approved-review-dispatch" : undefined,
          reviewOnly: true,
          jobId: latestQueueJob?.id,
          bridgeItemId: activeBridgeItem?.id,
          actor: "System",
          operator: options.operator ?? "StarLord/Thor operator",
          note: options.note,
          blockedReason: options.blockedReason,
          approvalNote: "Rex approval recorded for Phase 8 review-mode OpenClaw/operator bridge only; no web-app direct execution is allowed.",
        }),
      });
      const payload = (await response.json()) as { run?: FactoryRun; item?: OperatorBridgeOutboxItem; error?: string };
      if (!response.ok && !payload.run) throw new Error(payload.error ?? `Operator bridge update failed with ${response.status}`);
      if (payload.run) setRuns((current) => current.map((run) => (run.id === payload.run?.id ? payload.run : run)));
      if (payload.item) setLatestBridgeItem(payload.item);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to update OpenClaw/operator bridge");
    } finally {
      setSaving(false);
    }
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
            detail="Phase 8 wires the safe OpenClaw/operator bridge foundation: approved SDF queue jobs become review-mode outbox packets that StarLord/Thor can claim outside the web app. The app still performs no GitHub writes, notifications, production writes, shell commands, or direct agent spawning."
            eyebrow="Phase 8 · OpenClaw/operator bridge"
            title="Prepare approved review-mode operator packets without unsafe side effects."
          />
          <div className="sdf-model-grid">
            <div><span>1</span><h3>Read-only sync</h3><p>Server-only GitHub adapter reads PR and check-run status when env is configured; otherwise manual/simulated fallback records blockers.</p></div>
            <div><span>2</span><h3>Idempotent bridge outbox</h3><p>Launch jobs and operator packets are keyed by run, packet, approval state, and job so repeated prepare returns existing work.</p></div>
            <div><span>3</span><h3>Review-mode only</h3><p>Approved jobs prepare a structured OpenClaw/StarLord/Thor packet and exact lifecycle state; GitHub writes, messages, shell commands, and web-app agent spawning stay blocked.</p></div>
          </div>
          <IntegrationNotice adapter={adapter} error={error} />
        </article>

        <article className="panel-card sdf-intake-card" aria-labelledby="new-factory-run-heading">
          <SectionHeader
            detail="Saving creates a server-backed run in the registry below. The app prepares launch materials, but it does not spawn agents or mutate GitHub from the UI."
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
            <div><strong>{loading ? "…" : runs.length}</strong><span>API-backed runs</span></div>
            <div><strong>{readyRuns}</strong><span>launch-ready/running</span></div>
            <div><strong>{blockedRuns}</strong><span>blocked or incomplete</span></div>
            <div><strong>{requiredGates}</strong><span>required gates</span></div>
          </div>
          <div className="sdf-actions"><button className="primary-action" disabled={saving} onClick={saveDraftRun} type="button">{saving ? "Saving…" : "Save factory run"}</button></div>
        </article>

        <article className="panel-card">
          <SectionHeader detail="Select a run to see launch readiness, generated task packets, execution timeline, PR checkpoint status, approvals, and audit trail." eyebrow="Run registry" title="API-backed factory runs" />
          <div className="sdf-run-registry" aria-busy={loading}>
            {runs.length ? runs.map((run) => (
              <button aria-pressed={selectedRun?.id === run.id} className={`sdf-run-row${selectedRun?.id === run.id ? " selected" : ""}`} key={run.id} onClick={() => setSelectedRunId(run.id)} type="button">
                <div><p className="project-priority">Updated {formatDate(run.updatedAt)} · {run.intake.mode} · {run.prCheckpoint.syncSource}</p><h3>{run.title}</h3><p>{run.intake.productGoal}</p></div>
                <span className={`status-pill ${statusTone(run.state)}`}>{run.state}</span>
              </button>
            )) : <p>{loading ? "Loading SDF runs…" : "No factory runs found. Create one to seed the API registry."}</p>}
          </div>
        </article>

        {selectedRun ? (
          <article className="panel-card sdf-detail-card">
            <SectionHeader detail="This is the operational view Rex uses before a real Thor/helper launch." eyebrow="Selected run detail" title={selectedRun.title} />
            <div className="sdf-detail-toolbar" aria-label="Factory run state controls">
              {(["Draft", "Ready to launch", "Running", "Blocked", "Review ready", "PR open", "Done"] as FactoryRunState[]).map((state) => (
                <button className={selectedRun.state === state ? "selected" : ""} disabled={saving} key={state} onClick={() => updateRunState(state)} type="button">{state}</button>
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
            <SectionHeader detail="Prepare this packet for Thor/helper work. Phase 8 records an approved launch queue job, then prepares a review-mode OpenClaw/operator outbox item only after explicit Rex approval intent." eyebrow="Gated launch workflow" title="OpenClaw/operator review-mode launch request" />
            <div className="sdf-packet-toolbar"><button className="primary-action" onClick={copyPacket} type="button">{copied ? "Copied" : "Copy task packet"}</button><button disabled={saving} onClick={() => prepareLaunchRequest()} type="button">Queue launch job</button><button disabled={saving} onClick={() => prepareLaunchRequest("approved")} type="button">Record Rex approval + queue</button><button disabled={saving || !latestQueueJob} onClick={() => previewDispatch("dry-run")} type="button">Preview dry-run plan</button><button disabled={saving || !latestQueueJob} onClick={() => previewDispatch("review-dispatch")} type="button">Prepare review handoff</button><button disabled={saving || !latestQueueJob} onClick={() => updateOperatorBridge("prepare")} type="button">Prepare OpenClaw bridge</button><button disabled={saving || !latestQueueJob} onClick={() => previewDispatch("live")} type="button">Test live blocker</button><span>Only review-mode operator outbox is enabled; GitHub writes, notifications, production writes, shell commands, and direct agent spawning remain blocked.</span></div>
            {latestLaunch ? <div className="sdf-pr-grid"><div><span>Approval state</span><strong>{latestLaunch.approvalState}</strong></div><div><span>Policy state</span><strong>{selectedRun.approvalPolicy.state}</strong></div><div><span>Launch ready</span><strong>{latestLaunch.launchReady ? "Yes" : "No"}</strong></div><div><span>Prepared</span><strong>{formatDate(latestLaunch.createdAt)}</strong></div><div><span>Next action</span><strong>{latestLaunch.nextAction}</strong></div></div> : <p>No launch request has been prepared for this run yet.</p>}
            {latestQueueJob ? <div className="sdf-task-body-grid"><div><h4>Latest queue job</h4><div className="sdf-pr-grid"><div><span>State</span><strong>{latestQueueJob.state}</strong></div><div><span>Idempotency key</span><strong>{latestQueueJob.idempotencyKey}</strong></div><div><span>Packet hash</span><strong>{latestQueueJob.packetHash}</strong></div><div><span>Dispatch adapter</span><strong>{latestQueueJob.dispatchAdapter}</strong></div><div><span>Review dispatch</span><strong>{latestHandoff ? latestHandoff.state : "Not prepared"}</strong></div></div></div><div><h4>Why blocked or ready</h4><ul className="detail-list compact-list">{(latestQueueJob.blockedReasons.length ? latestQueueJob.blockedReasons : [latestQueueJob.auditNote]).map((item) => <li key={item}>{item}</li>)}</ul></div></div> : null}
            {latestHandoff ? <div className="sdf-task-body-grid"><div><h4>Prepared handoff packet</h4><div className="sdf-pr-grid"><div><span>Handoff state</span><strong>{latestHandoff.state}</strong></div><div><span>Handoff key</span><strong>{latestHandoff.idempotencyKey}</strong></div><div><span>Adapter</span><strong>{latestHandoff.adapter}</strong></div><div><span>Review only</span><strong>{latestHandoff.reviewModeOnly ? "Yes" : "No"}</strong></div><div><span>External execution</span><strong>{latestHandoff.externalExecution ? "Yes" : "No"}</strong></div></div></div><div><h4>Exact operator next action</h4><p>{latestHandoff.operatorNextAction}</p><ul className="detail-list compact-list">{(latestHandoff.blockerReasons.length ? latestHandoff.blockerReasons : ["Waiting for StarLord/Thor operator to run the packet in a separate review-mode agent session."]).map((item) => <li key={item}>{item}</li>)}</ul></div></div> : null}
            {activeBridgeItem ? <div className="sdf-task-body-grid"><div><h4>OpenClaw/operator bridge outbox</h4><div className="sdf-pr-grid"><div><span>State</span><strong>{activeBridgeItem.state}</strong></div><div><span>Handoff id</span><strong>{activeBridgeItem.handoffId}</strong></div><div><span>Run id</span><strong>{activeBridgeItem.runId}</strong></div><div><span>Queue job id</span><strong>{activeBridgeItem.queueJobId}</strong></div><div><span>Actor/operator</span><strong>{activeBridgeItem.operator ?? activeBridgeItem.actor}</strong></div><div><span>Review only</span><strong>{activeBridgeItem.reviewModeOnly ? "Yes" : "No"}</strong></div><div><span>External execution</span><strong>{activeBridgeItem.externalExecution ? "Yes" : "No"}</strong></div><div><span>Updated</span><strong>{formatDate(activeBridgeItem.updatedAt)}</strong></div></div></div><div><h4>Operator lifecycle controls</h4><div className="sdf-packet-toolbar"><button disabled={saving} onClick={() => updateOperatorBridge("claim", { note: "StarLord/Thor operator claimed the review-mode bridge packet." })} type="button">Claim</button><button disabled={saving} onClick={() => updateOperatorBridge("start-review", { note: "StarLord/Thor operator marked review-running." })} type="button">Mark review running</button><button disabled={saving} onClick={() => updateOperatorBridge("complete-review", { note: "Review-mode operator work completed; record branch, commit, PR, verification, and blockers separately." })} type="button">Complete review</button><button disabled={saving} onClick={() => updateOperatorBridge("block", { blockedReason: "Operator marked this bridge blocked pending Rex/Thor follow-up." })} type="button">Block</button><button disabled={saving} onClick={() => updateOperatorBridge("cancel", { note: "Operator bridge cancelled without external side effects." })} type="button">Cancel</button><button disabled={saving} onClick={() => updateOperatorBridge("fail", { note: "Operator bridge failed safely without external side effects." })} type="button">Fail</button></div><p>Packet type: {activeBridgeItem.executionPacket.packetType} · schema {activeBridgeItem.executionPacket.schemaVersion}</p><ul className="detail-list compact-list">{(activeBridgeItem.blockedReasons.length ? activeBridgeItem.blockedReasons : activeBridgeItem.notes).map((item) => <li key={item}>{item}</li>)}</ul></div></div> : <div className="sdf-notice" role="note"><strong>Bridge not prepared yet:</strong> record Rex approval, keep reviewOnly=true, then prepare the OpenClaw bridge. Repeated prepare returns the same idempotent outbox item.</div>}
            {activeBridgeItem ? <pre className="sdf-task-packet">{JSON.stringify(activeBridgeItem.executionPacket, null, 2)}</pre> : null}
            <pre className="sdf-task-packet">{taskPacket}</pre>
          </article>
        ) : null}

        {selectedRun ? (
          <article className="panel-card">
            <SectionHeader detail="The dispatcher records the approved review-mode handoff packet, adapter capability checks, idempotency, blockers, and the exact operator next action. Phase 8 adds the OpenClaw/operator outbox lifecycle while live side effects remain blocked." eyebrow="Phase 8 dispatcher + bridge" title="Review dispatch handoff and adapter readiness" />
            <div className="sdf-pr-grid">
              <div><span>Dispatcher status</span><strong>{dispatcher?.status ?? "review-only"}</strong></div>
              <div><span>Default mode</span><strong>{dispatcher?.defaultMode ?? "review-dispatch"}</strong></div>
              <div><span>Live execution</span><strong>{dispatcher?.liveExecutionEnabled ? "Enabled" : "Blocked"}</strong></div>
              <div><span>Latest result</span><strong>{activeDispatch?.outcome ?? "No dispatch preview yet"}</strong></div>
            </div>
            <p>{dispatcher?.summary ?? "Dispatcher readiness is loading; default behavior is review-mode handoff only."}</p>
            {activeDispatch ? <div className="sdf-task-body-grid"><div><h4>Dispatch plan</h4><p>{activeDispatch.plan.summary}</p><ul className="detail-list compact-list">{(activeDispatch.plan.steps ?? []).map((step) => <li key={step.id}>{step.action} — {step.detail}</li>)}</ul></div><div><h4>Blocker reasons</h4><ul className="detail-list compact-list">{(activeDispatch.plan.blockerReasons.length ? activeDispatch.plan.blockerReasons : ["Review handoff is approved/prepared; live GitHub writes, notifications, and web-app agent spawning are still disabled."])?.map((item) => <li key={item}>{item}</li>)}</ul></div></div> : <p>No dispatch preview has been recorded. Queue an approved launch job, then prepare a review handoff.</p>}
            <div className="sdf-generated-graph">
              {(dispatcher?.adapters ?? []).map((capability) => (
                <div className="sdf-generated-task" key={capability.kind}>
                  <div className="pipeline-headline"><div><p className="project-priority">{capability.kind}</p><h3>{capability.label}</h3></div><span className={`status-pill ${statusTone(capability.status)}`}>{capability.status}</span></div>
                  <div className="sdf-task-footer"><span>Read-only: {capability.readOnly ? "Yes" : "No"}</span><span>Write enabled: {capability.writeEnabled ? "Yes" : "No"}</span><span>Requires approval: {capability.requiresApproval ? "Yes" : "No"}</span><span>Dry-run: {capability.supportsDryRun ? "Supported" : "Unsupported"}</span></div>
                  <p>{capability.blocker}</p>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {selectedRun ? (
          <article className="panel-card">
            <SectionHeader detail="GitHub status is modeled behind a server-only read adapter. Live sync needs env credentials with read permissions; manual/simulated data is safe for local development and review." eyebrow="GitHub checkpoint sync" title="Branch, commit, checks, review, blockers, and next action" />
            <div className="sdf-packet-toolbar"><button disabled={saving} onClick={() => syncCheckpoint("manual")} type="button">Record manual check</button><button disabled={saving} onClick={() => syncCheckpoint("simulated")} type="button">Simulate sync</button><button disabled={saving} onClick={() => syncCheckpoint("live")} type="button">Try live sync boundary</button><span>Source: {selectedRun.prCheckpoint.syncSource} · last checked {formatDate(selectedRun.prCheckpoint.lastCheckedAt)}</span></div>
            <div className="sdf-pr-grid">
              <div><span>PR URL</span><strong>{selectedRun.prCheckpoint.prUrl || "Pending manual PR"}</strong></div>
              <div><span>Branch</span><strong>{selectedRun.prCheckpoint.branch}</strong></div>
              <div><span>Commit</span><strong>{selectedRun.prCheckpoint.commit}</strong></div>
              <div><span>Check status</span><strong>{selectedRun.prCheckpoint.checkStatus}</strong></div>
              <div><span>Review state</span><strong>{selectedRun.prCheckpoint.reviewState}</strong></div>
              <div><span>Live sync</span><strong>{selectedRun.prCheckpoint.liveSync ? "Connected" : "Not connected"}</strong></div>
              <div><span>Live readiness</span><strong>{selectedRun.prCheckpoint.liveReadiness.status}</strong></div>
              <div><span>Repository</span><strong>{selectedRun.prCheckpoint.liveReadiness.repository || "Not configured"}</strong></div>
              <div><span>Required permission</span><strong>pull_requests/checks read only</strong></div>
            </div>
            <div className="sdf-task-body-grid">
              <div><h4>Risks/blockers</h4><ul className="detail-list compact-list">{[...selectedRun.prCheckpoint.risks, ...selectedRun.prCheckpoint.blockers, selectedRun.prCheckpoint.liveReadiness.blocker].filter(Boolean).map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div><h4>Next action</h4><p>{selectedRun.prCheckpoint.nextAction}</p>{selectedRun.prCheckpoint.liveReadiness.lastError ? <p>Last live error: {selectedRun.prCheckpoint.liveReadiness.lastError}</p> : null}</div>
            </div>
          </article>
        ) : null}

        {selectedRun ? (
          <article className="panel-card">
            <SectionHeader detail="Every persistence update, launch request, approval change, and checkpoint sync writes a non-secret audit event." eyebrow="Audit trail" title="Operational event log" />
            <div className="sdf-timeline">
              {selectedRun.auditTrail.length ? selectedRun.auditTrail.map((event) => <div className="sdf-timeline-item" key={event.id}><span className={`status-pill ${statusTone(event.action)}`}>{event.action}</span><div><strong>{event.summary}</strong><p>{event.actor} · {formatDate(event.createdAt)}</p></div></div>) : <p>No audit events yet.</p>}
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
        <article className="panel-card accent-card"><SectionHeader detail="Rex should see the decision surface before live work starts." eyebrow="Rex checkpoint" title="Ready, needs input, blocked, approval" /><div className="sdf-checkpoint-list">{reviewCheckpoints.map((checkpoint) => <div className="sdf-checkpoint-card" key={checkpoint.label}><div className="control-card-head"><h3>{checkpoint.label}</h3><span className={`status-pill ${statusTone(checkpoint.state)}`}>{checkpoint.state}</span></div><p>{checkpoint.detail}</p></div>)}</div>{selectedRun ? <div className="sdf-checkpoint-list"><h3>Approval policy</h3>{selectedRun.approvalPolicy.requirements.map((requirement) => <div className="sdf-checkpoint-card" key={requirement.id}><div className="control-card-head"><h3>{requirement.label}</h3><span className={`status-pill ${statusTone(requirement.passed ? "Approved" : "Blocked")}`}>{requirement.passed ? "Passed" : "Blocked"}</span></div><p>{requirement.detail}</p></div>)}</div> : null}</article>
        <article className="panel-card control-panel"><SectionHeader detail="Every factory run should show what evidence exists before it asks Rex to trust the output." eyebrow="Quality gates" title="Checkpoint standards" /><div className="control-grid">{gates.map((gate) => <div className="control-card" key={gate.id}><div className="control-card-head"><h3>{gate.label}</h3><span className={`status-pill ${statusTone(gate.status)}`}>{gate.status}</span></div><p>{gate.evidence}</p></div>)}</div></article>
        <article className="panel-card"><SectionHeader detail="The seeded SDF foundation remains visible so Rex can see how Phase 4 maps onto the factory model." eyebrow="Foundation pipeline" title="Factory stages already defined" /><div className="sdf-pipeline-rail">{pipeline.map((stage, index) => <div className="pipeline-step" key={stage.id}><span className="pipeline-index">{index + 1}</span><div><div className="pipeline-headline"><h3>{stage.label}</h3><span className={`status-pill ${statusTone(stage.status)}`}>{stage.status}</span></div><p>{stage.detail}</p><div className="thread-meta">Owner: {stage.owner}</div></div></div>)}</div></article>
        <article className="panel-card"><SectionHeader detail="Seeded outputs keep the older SDF concept visible while Phase 4 adds server-backed operations." eyebrow="Seeded outputs" title="Existing phase tasks and Rex input queue" /><div className="sdf-task-list compact-sdf-list">{tasks.map((task) => <div className="ops-task-card" key={task.id}><div className="ops-task-topline"><div><p className="project-priority">{task.phase} · {task.owner}</p><h3>{task.title}</h3></div><span className={`status-pill ${statusTone(task.status)}`}>{task.status}</span></div></div>)}</div><div className="dispatch-list sdf-rex-input-list">{rexInputs.map((item) => <div className="dispatch-card" key={item.id}><p className="project-priority">{item.priority} · {item.neededFor}</p><h3>{item.title}</h3><p>{item.prompt}</p></div>)}</div></article>
        <article className="panel-card sdf-readiness-card"><p className="eyebrow">Phase 8 bridge path</p><h2>Only OpenClaw/operator review-mode outbox is enabled.</h2><p>Mission Control can prepare, claim, run, complete, block, cancel, or fail an auditable operator packet after Rex approval. GitHub writes, notifications, production writes, shell commands, and direct agent spawning stay blocked until a later phase.</p></article>
      </div>
    </section>
  );
}
