import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { appendAudit, buildReadiness, buildTaskPacket, buildTimeline, createLaunchRequest, createRun, createSeedRuns, defaultApprovalPolicy, defaultGitHubLiveReadiness, generateId, generateTaskGraph, nowIso } from "./factory";
import { chooseLaunchQueueState, deriveLaunchIdempotencyKey, evaluateApprovalPolicy, stableHash } from "./approval-policy";
import { buildDispatchPlan, createDispatchAttempt, createThorReviewHandoff, findDispatchableJob, getDispatcherReadiness } from "./dispatcher";
import { getGitHubLiveReadiness, readGitHubCheckpoint } from "./github";
import { buildOperatorBridgeOutboxItem, transitionOperatorBridgeItem } from "./operator-bridge";
import type { BuildIntake, DispatchAttempt, DispatchMode, FactoryRun, FactoryRunState, LaunchApprovalState, LaunchQueueJob, OperatorBridgeAction, OperatorBridgeOutboxItem, SdfRunRegistryResponse } from "./types";

const dataDir = process.env.SDF_DATA_DIR || path.join(process.cwd(), ".mission-control-data", "sdf");
const dataFile = path.join(dataDir, "runs.json");

const intakeSchema = z.object({
  appName: z.string().default("Untitled factory run"),
  productGoal: z.string().default(""),
  mode: z.enum(["Assisted", "Factory", "Autopilot"]).default("Factory"),
  appType: z.string().default("Next.js product dashboard"),
  repoDetails: z.string().default(""),
  designAssets: z.string().default(""),
  requiredFeatures: z.string().default(""),
  constraints: z.string().default(""),
  rexProvides: z.string().default(""),
});

const stateSchema = z.enum(["Draft", "Ready to launch", "Running", "Blocked", "Review ready", "PR open", "Done"]);
const approvalSchema = z.enum(["draft", "requested", "approved", "rejected", "launched"]);
const dispatchModeSchema = z.enum(["dry-run", "review", "review-dispatch", "operator-handoff", "live"]);
const operatorBridgeActionSchema = z.enum(["prepare", "claim", "start-review", "complete-review", "block", "cancel", "fail"]);

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify({ runs: createSeedRuns().map(normalizeRun) }, null, 2));
  }
}

function normalizeRun(run: FactoryRun): FactoryRun {
  const withDefaults: FactoryRun = {
    ...run,
    launchRequests: run.launchRequests ?? [],
    launchQueue: run.launchQueue ?? [],
    approvalPolicy: run.approvalPolicy ?? defaultApprovalPolicy,
    dispatchAttempts: run.dispatchAttempts ?? [],
    operatorBridgeOutbox: run.operatorBridgeOutbox ?? [],
    auditTrail: run.auditTrail ?? [],
    prCheckpoint: {
      ...run.prCheckpoint,
      liveReadiness: run.prCheckpoint?.liveReadiness ?? defaultGitHubLiveReadiness,
    },
  };
  return { ...withDefaults, approvalPolicy: evaluateApprovalPolicy(withDefaults) };
}

export function getSdfDispatcherReadiness() {
  return getDispatcherReadiness();
}

async function readRunsUnsafe(): Promise<FactoryRun[]> {
  await ensureStore();
  const raw = await fs.readFile(dataFile, "utf8");
  const parsed = JSON.parse(raw) as { runs?: FactoryRun[] };
  return (Array.isArray(parsed.runs) ? parsed.runs : createSeedRuns()).map(normalizeRun);
}

async function writeRuns(runs: FactoryRun[]) {
  await fs.mkdir(dataDir, { recursive: true });
  const tmp = `${dataFile}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ runs: runs.map(normalizeRun) }, null, 2));
  await fs.rename(tmp, dataFile);
}

export function getSdfAdapter(): SdfRunRegistryResponse["adapter"] {
  return {
    kind: "file",
    source: process.env.SDF_DATA_DIR ? "SDF_DATA_DIR" : ".mission-control-data/sdf/runs.json",
    primary: true,
    fallback: "localStorage",
  };
}

export async function listRuns(): Promise<SdfRunRegistryResponse> {
  return { runs: await readRunsUnsafe(), adapter: getSdfAdapter(), dispatcher: getDispatcherReadiness() };
}

export async function getRun(id: string): Promise<FactoryRun | null> {
  const runs = await readRunsUnsafe();
  return runs.find((run) => run.id === id) ?? null;
}

export async function createRunRecord(input: unknown): Promise<FactoryRun> {
  const intake: BuildIntake = intakeSchema.parse(input);
  const run = normalizeRun(createRun(intake, buildReadiness(intake).every((item) => item.complete) ? "Ready to launch" : "Draft"));
  const runs = await readRunsUnsafe();
  await writeRuns([run, ...runs]);
  return run;
}

export async function updateRunRecord(id: string, patch: unknown): Promise<FactoryRun | null> {
  const parsed = z.object({ state: stateSchema.optional(), intake: intakeSchema.partial().optional() }).parse(patch);
  const runs = await readRunsUnsafe();
  let updated: FactoryRun | null = null;
  const next = runs.map((run) => {
    if (run.id !== id) return run;
    const intake = parsed.intake ? { ...run.intake, ...parsed.intake } : run.intake;
    const tasks = parsed.intake ? generateTaskGraph(intake) : run.tasks;
    const state: FactoryRunState = parsed.state ?? run.state;
    const nextRun = normalizeRun({
      ...run,
      state,
      intake,
      tasks,
      readiness: parsed.intake ? buildReadiness(intake) : run.readiness,
      timeline: parsed.intake ? buildTimeline(tasks) : run.timeline,
      updatedAt: nowIso(),
      prCheckpoint: {
        ...run.prCheckpoint,
        checkStatus: state === "PR open" ? "Pending" : state === "Done" ? "Passing" : run.prCheckpoint.checkStatus,
        reviewState: state === "Review ready" || state === "PR open" ? "Needs Rex" : state === "Done" ? "Approved" : run.prCheckpoint.reviewState,
      },
    });
    updated = appendAudit(nextRun, { action: "run.updated", actor: "System", summary: `Run updated${parsed.state ? ` to ${parsed.state}` : ""}.`, metadata: { state } });
    return updated;
  });
  if (!updated) return null;
  await writeRuns(next);
  return normalizeRun(updated);
}

export async function syncCheckpoint(id: string, body: unknown): Promise<FactoryRun | null> {
  const parsed = z
    .object({
      source: z.enum(["live", "manual", "simulated"]).default("manual"),
      prUrl: z.string().url().or(z.literal("")).optional(),
      branch: z.string().optional(),
      commit: z.string().optional(),
      checkStatus: z.enum(["Simulated", "Pending", "Passing", "Failing", "Not connected"]).optional(),
      reviewState: z.enum(["Not requested", "Needs Rex", "Changes requested", "Approved"]).optional(),
      blockers: z.array(z.string()).optional(),
      nextAction: z.string().optional(),
    })
    .parse(body ?? {});

  const runs = await readRunsUnsafe();
  let updated: FactoryRun | null = null;
  const next = await Promise.all(runs.map(async (run) => {
    if (run.id !== id) return run;
    const requestedAt = nowIso();
    let checkpoint = {
      source: parsed.source,
      liveReadiness: getGitHubLiveReadiness(),
      prUrl: parsed.prUrl ?? run.prCheckpoint.prUrl,
      branch: parsed.branch ?? run.prCheckpoint.branch,
      commit: parsed.commit ?? run.prCheckpoint.commit,
      checkStatus: parsed.checkStatus ?? (parsed.source === "simulated" ? "Simulated" as const : "Pending" as const),
      reviewState: parsed.reviewState ?? run.prCheckpoint.reviewState,
      blockers: parsed.blockers ?? run.prCheckpoint.blockers,
      nextAction: parsed.nextAction ?? "Review the latest checkpoint state before launch or PR handoff.",
    };

    if (parsed.source === "live") {
      checkpoint = await readGitHubCheckpoint({ prUrl: parsed.prUrl ?? run.prCheckpoint.prUrl, branch: parsed.branch ?? run.prCheckpoint.branch, commit: parsed.commit ?? run.prCheckpoint.commit });
    }

    const nextRun = normalizeRun({
      ...run,
      updatedAt: requestedAt,
      prCheckpoint: {
        ...run.prCheckpoint,
        prUrl: checkpoint.prUrl,
        branch: checkpoint.branch,
        commit: checkpoint.commit,
        checkStatus: checkpoint.checkStatus,
        reviewState: checkpoint.reviewState,
        blockers: checkpoint.blockers,
        nextAction: checkpoint.nextAction,
        liveSync: checkpoint.source === "live" && checkpoint.liveReadiness.configured,
        syncSource: checkpoint.source,
        lastCheckedAt: requestedAt,
        liveReadiness: checkpoint.liveReadiness,
      },
    });
    updated = appendAudit(nextRun, {
      action: "sync.updated",
      actor: "System",
      summary: `Checkpoint sync recorded from ${checkpoint.source} source${parsed.source === "live" && checkpoint.source !== "live" ? " after live sync was blocked" : ""}.`,
      metadata: { requestedSource: parsed.source, recordedSource: checkpoint.source, liveConfigured: checkpoint.liveReadiness.configured, blockerCount: checkpoint.blockers.length },
    });
    return updated;
  }));
  if (!updated) return null;
  await writeRuns(next);
  return normalizeRun(updated);
}

export async function prepareLaunchRequest(id: string, body: unknown): Promise<FactoryRun | null> {
  const parsed = z
    .object({
      approvalNote: z.string().optional(),
      approvalState: approvalSchema.optional(),
      acknowledgedBlockers: z.boolean().default(false),
      dispatchRequested: z.boolean().default(false),
    })
    .parse(body ?? {});
  const runs = await readRunsUnsafe();
  let updated: FactoryRun | null = null;
  const next = runs.map((run) => {
    if (run.id !== id) return run;
    const request = createLaunchRequest(run, parsed.approvalNote);
    const approvalState: LaunchApprovalState = parsed.approvalState ?? request.approvalState;
    const policyRun = normalizeRun({ ...run, launchRequests: [{ ...request, approvalState }, ...(run.launchRequests ?? [])] });
    const policy = evaluateApprovalPolicy(policyRun, { approvalState, acknowledgedBlockers: parsed.acknowledgedBlockers, dispatchRequested: parsed.dispatchRequested });
    const idempotencyKey = deriveLaunchIdempotencyKey(run, approvalState, parsed.acknowledgedBlockers);
    const existingJob = (run.launchQueue ?? []).find((job) => job.idempotencyKey === idempotencyKey);

    if (existingJob) {
      updated = appendAudit(
        normalizeRun({ ...run, approvalPolicy: policy, updatedAt: nowIso() }),
        {
          action: "launch.idempotent-hit",
          actor: "System",
          summary: `Existing launch queue job returned for idempotency key ${idempotencyKey}.`,
          metadata: { idempotencyKey, jobId: existingJob.id, state: existingJob.state },
        },
      );
      return updated;
    }

    const launchRequest = { ...request, approvalState, updatedAt: nowIso(), launchReady: policy.state === "approved" || policy.state === "dispatch-ready", nextAction: policy.canPrepareReviewDispatch ? "Review-mode Thor/helper operator handoff can be prepared; no web-app agent spawn will occur." : "Queue is prepared, but review dispatch remains blocked until Rex approval, blockers, and adapter policy pass." };
    const queueState = chooseLaunchQueueState(policy, approvalState);
    const packetHash = stableHash(buildTaskPacket(run));
    const job: LaunchQueueJob = {
      id: generateId("launch-job"),
      runId: run.id,
      launchRequestId: launchRequest.id,
      idempotencyKey,
      state: queueState,
      requestedBy: "System",
      packetHash,
      approvalState,
      approvalPolicy: policy,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      blockedReasons: policy.reasons,
      dispatchAdapter: policy.canPrepareReviewDispatch ? "safe-backend" : "none",
      auditNote: parsed.dispatchRequested
        ? "Dispatch was requested; Phase 8 can prepare only a Thor/helper review-mode operator handoff. No direct agent spawn or external write occurred."
        : "Launch job queued/prepared only. No external agent, GitHub write, message, or production mutation was dispatched.",
    };

    updated = appendAudit(
      normalizeRun({ ...run, updatedAt: nowIso(), launchRequests: [launchRequest, ...(run.launchRequests ?? [])], launchQueue: [job, ...(run.launchQueue ?? [])], approvalPolicy: policy }),
      {
        action: approvalState === "approved" ? "approval.changed" : "launch.queued",
        actor: "System",
        summary: approvalState === "approved" ? "Rex approval state recorded and idempotent launch job evaluated." : "Idempotent launch job prepared; no real agent was started.",
        metadata: { approvalState, queueState, idempotencyKey, canDispatchExternalWork: policy.canDispatchExternalWork },
      },
    );
    return updated;
  });
  if (!updated) return null;
  await writeRuns(next);
  return normalizeRun(updated);
}

export async function dispatchLaunchJob(id: string, body: unknown): Promise<{ run: FactoryRun; dispatch: DispatchAttempt } | null> {
  const parsed = z
    .object({
      mode: dispatchModeSchema.default("dry-run"),
      dryRun: z.boolean().optional(),
      reviewOnly: z.boolean().optional(),
      intent: z.enum(["preview", "dry-run", "review", "review-dispatch", "operator-handoff", "live"]).default("preview"),
      approvalIntent: z.enum(["rex-approved-review-dispatch"]).optional(),
      jobId: z.string().optional(),
      requestedBy: z.enum(["Rex", "Thor", "System"]).default("System"),
    })
    .parse(body ?? {});

  const explicitReviewIntent = parsed.dryRun === true || parsed.reviewOnly === true || parsed.intent === "preview" || parsed.intent === "dry-run" || parsed.intent === "review" || parsed.intent === "review-dispatch" || parsed.intent === "operator-handoff" || parsed.mode === "review" || parsed.mode === "dry-run" || parsed.mode === "review-dispatch" || parsed.mode === "operator-handoff";
  const requestedMode: DispatchMode = parsed.intent === "live" || parsed.intent === "review-dispatch" || parsed.intent === "operator-handoff" ? parsed.intent : parsed.mode;
  const reviewDispatchRequested = requestedMode === "review-dispatch" || requestedMode === "operator-handoff";

  const runs = await readRunsUnsafe();
  let result: { run: FactoryRun; dispatch: DispatchAttempt } | null = null;
  const next = runs.map((run) => {
    if (run.id !== id) return run;
    const job = findDispatchableJob(run, parsed.jobId);
    const checkedRun = appendAudit(normalizeRun({ ...run, updatedAt: nowIso() }), {
      action: "dispatch.adapter.checked",
      actor: "System",
      summary: "Dispatcher adapter readiness checked; Phase 7 only permits Thor/helper review-mode handoff preparation while live write adapters remain disabled.",
      metadata: { adapterCount: getDispatcherReadiness().adapters.length, liveExecutionEnabled: false },
    });

    if (!job) {
      const syntheticJob: LaunchQueueJob = {
        id: "missing-launch-job",
        runId: run.id,
        launchRequestId: "missing",
        idempotencyKey: stableHash([run.id, "missing-launch-job"].join("|")),
        state: "blocked",
        requestedBy: "System",
        packetHash: stableHash(buildTaskPacket(run)),
        approvalState: "draft",
        approvalPolicy: run.approvalPolicy,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        blockedReasons: ["No launch queue job exists yet. Queue an approved launch request before dispatch review."],
        dispatchAdapter: "none",
        auditNote: "Dispatch preview blocked because no queue job exists.",
      };
      const blockedAttempt = createDispatchAttempt(checkedRun, syntheticJob, requestedMode, parsed.requestedBy);
      const updated = appendAudit({ ...checkedRun, dispatchAttempts: [blockedAttempt, ...(checkedRun.dispatchAttempts ?? [])] }, {
        action: "dispatch.blocked",
        actor: "System",
        summary: "Dispatch preview blocked because no launch queue job exists.",
        metadata: { mode: requestedMode, runId: run.id },
      });
      result = { run: normalizeRun(updated), dispatch: blockedAttempt };
      return result.run;
    }

    const previewPlan = buildDispatchPlan(checkedRun, job, requestedMode);
    const existing = (checkedRun.dispatchAttempts ?? []).find((attempt) => attempt.idempotencyKey === previewPlan.idempotencyKey);
    if (existing) {
      const updated = appendAudit(checkedRun, {
        action: reviewDispatchRequested ? "operator.handoff-ready" : "dispatch.previewed",
        actor: "System",
        summary: `Existing dispatch ${existing.outcome} record returned for idempotency key ${existing.idempotencyKey}.`,
        metadata: { jobId: job.id, mode: requestedMode, idempotent: true, outcome: existing.outcome, reviewDispatchRequested },
      });
      result = { run: normalizeRun(updated), dispatch: { ...existing, outcome: "idempotent-hit" } };
      return result.run;
    }

    if (reviewDispatchRequested && parsed.approvalIntent !== "rex-approved-review-dispatch") {
      const blockedAttempt = {
        ...createDispatchAttempt(checkedRun, job, requestedMode, parsed.requestedBy, {
          ...createThorReviewHandoff(checkedRun, job),
          idempotencyKey: `${previewPlan.idempotencyKey}-missing-intent`,
          state: "blocked",
          blockerReasons: ["Request intent must include approvalIntent=rex-approved-review-dispatch for Phase 8 review-mode handoff."],
          operatorNextAction: "Record explicit Rex approval intent in the dispatch request, then retry review-dispatch.",
        }),
        idempotencyKey: `${previewPlan.idempotencyKey}-missing-intent`,
      };
      const updated = appendAudit(normalizeRun({ ...checkedRun, dispatchAttempts: [blockedAttempt, ...(checkedRun.dispatchAttempts ?? [])], updatedAt: nowIso() }), {
        action: "dispatch.policy.failed",
        actor: "System",
        summary: "Review dispatch blocked because explicit Rex approval intent was missing from the request.",
        metadata: { jobId: job.id, mode: requestedMode, approvalIntentPresent: false },
      });
      result = { run: normalizeRun(updated), dispatch: blockedAttempt };
      return result.run;
    }

    const handoff = reviewDispatchRequested ? createThorReviewHandoff(checkedRun, job) : undefined;
    const attempt = createDispatchAttempt(checkedRun, job, requestedMode, parsed.requestedBy, handoff);
    const preparedJob: LaunchQueueJob = handoff && attempt.outcome === "prepared"
      ? { ...job, state: "dispatched-ready", dispatchAdapter: "thor-helper-review", reviewHandoff: handoff, updatedAt: nowIso(), auditNote: "Phase 8 OpenClaw/operator review-mode operator handoff prepared. Waiting for StarLord/Thor operator execution; no web-app external side effects occurred." }
      : job;
    const launchQueue = (checkedRun.launchQueue ?? []).map((item) => item.id === job.id ? preparedJob : item);
    const action = requestedMode === "live" || !explicitReviewIntent || attempt.outcome === "blocked" ? "dispatch.blocked" : reviewDispatchRequested ? "dispatch.review-prepared" : "dispatch.dry-run-approved";
    const summary = attempt.outcome === "prepared"
      ? "Thor/helper review-mode handoff prepared and marked waiting for operator; no external side effects occurred."
      : attempt.outcome === "planned"
        ? "Approved dry-run dispatch plan recorded; no external side effects occurred."
        : "Dispatch was blocked by Phase 8 safety policy; no external side effects occurred.";
    const updated = appendAudit(
      normalizeRun({ ...checkedRun, launchQueue, dispatchAttempts: [attempt, ...(checkedRun.dispatchAttempts ?? [])], updatedAt: nowIso() }),
      {
        action: action === "dispatch.blocked" && attempt.outcome === "blocked" && job.approvalState !== "approved" ? "dispatch.policy.failed" : action,
        actor: "System",
        summary,
        metadata: { jobId: job.id, mode: requestedMode, outcome: attempt.outcome, explicitReviewIntent, reviewDispatchRequested, liveExecutionBlocked: attempt.plan.liveExecutionBlocked },
      },
    );
    const withHandoffAudit = attempt.outcome === "prepared" ? appendAudit(updated, {
      action: "operator.handoff-ready",
      actor: "System",
      summary: "Operator handoff packet is ready for StarLord/Thor review-mode execution outside the web app.",
      metadata: { jobId: job.id, handoffId: handoff?.id ?? null, idempotencyKey: handoff?.idempotencyKey ?? null },
    }) : updated;
    result = { run: normalizeRun(withHandoffAudit), dispatch: attempt };
    return result.run;
  });

  if (!result) return null;
  await writeRuns(next);
  const finalResult = result as { run: FactoryRun; dispatch: DispatchAttempt };
  return { run: normalizeRun(finalResult.run), dispatch: finalResult.dispatch };
}

export async function updateOperatorBridgeOutbox(id: string, body: unknown): Promise<{ run: FactoryRun; item: OperatorBridgeOutboxItem; idempotent: boolean } | null> {
  const parsed = z
    .object({
      action: operatorBridgeActionSchema.default("prepare"),
      approvalIntent: z.enum(["rex-approved-review-dispatch"]).optional(),
      reviewOnly: z.boolean().default(true),
      jobId: z.string().optional(),
      bridgeItemId: z.string().optional(),
      handoffId: z.string().optional(),
      actor: z.enum(["Rex", "Thor", "System"]).default("System"),
      operator: z.string().optional(),
      note: z.string().optional(),
      blockedReason: z.string().optional(),
      approvalNote: z.string().optional(),
    })
    .parse(body ?? {});

  const runs = await readRunsUnsafe();
  let result: { run: FactoryRun; item: OperatorBridgeOutboxItem; idempotent: boolean } | null = null;

  const next = runs.map((run) => {
    if (run.id !== id) return run;
    const checkedRun = normalizeRun({ ...run, updatedAt: nowIso() });
    const action = parsed.action as OperatorBridgeAction;

    if (action === "prepare") {
      const job = findDispatchableJob(checkedRun, parsed.jobId);
      if (!job) {
        throw new Error("No launch queue job exists. Queue an approved review-mode launch request before preparing the OpenClaw/operator bridge.");
      }
      if (parsed.approvalIntent !== "rex-approved-review-dispatch" || parsed.reviewOnly !== true) {
        const blockedItem = buildOperatorBridgeOutboxItem(checkedRun, job, { actor: parsed.actor, approvalNote: parsed.approvalNote });
        const item = {
          ...blockedItem,
          idempotencyKey: `${blockedItem.idempotencyKey}-missing-approval-intent`,
          id: `${blockedItem.id}-missing-approval-intent`,
          state: "blocked" as const,
          blockedReasons: ["Prepare requires approvalIntent=rex-approved-review-dispatch and reviewOnly=true. Live/external execution remains blocked.", ...blockedItem.blockedReasons],
          notes: ["OpenClaw/operator bridge preparation was blocked by missing explicit review-mode approval intent.", ...blockedItem.notes],
        };
        const updated = appendAudit(normalizeRun({ ...checkedRun, operatorBridgeOutbox: [item, ...(checkedRun.operatorBridgeOutbox ?? [])] }), {
          action: "operator.bridge.blocked",
          actor: "System",
          summary: "OpenClaw/operator bridge preparation blocked because explicit review-mode Rex approval intent was missing.",
          metadata: { jobId: job.id, reviewOnly: parsed.reviewOnly, approvalIntentPresent: Boolean(parsed.approvalIntent), externalSideEffectsAllowed: false },
        });
        result = { run: normalizeRun(updated), item, idempotent: false };
        return result.run;
      }

      const item = buildOperatorBridgeOutboxItem(checkedRun, job, { actor: parsed.actor, approvalNote: parsed.approvalNote });
      const existing = (checkedRun.operatorBridgeOutbox ?? []).find((bridgeItem) => bridgeItem.idempotencyKey === item.idempotencyKey);
      if (existing) {
        const updated = appendAudit(checkedRun, {
          action: "operator.bridge.idempotent-hit",
          actor: "System",
          summary: `Existing OpenClaw/operator bridge outbox item returned for idempotency key ${existing.idempotencyKey}.`,
          metadata: { bridgeItemId: existing.id, handoffId: existing.handoffId, state: existing.state, externalSideEffectsAllowed: false },
        });
        result = { run: normalizeRun(updated), item: existing, idempotent: true };
        return result.run;
      }

      const updated = appendAudit(normalizeRun({ ...checkedRun, operatorBridgeOutbox: [item, ...(checkedRun.operatorBridgeOutbox ?? [])] }), {
        action: item.state === "prepared" ? "operator.bridge.prepared" : "operator.bridge.blocked",
        actor: "System",
        summary: item.state === "prepared" ? "OpenClaw/operator bridge outbox item prepared for review-mode manual/operator execution." : "OpenClaw/operator bridge outbox item recorded as blocked by approval policy.",
        metadata: { bridgeItemId: item.id, handoffId: item.handoffId, jobId: job.id, reviewModeOnly: true, externalSideEffectsAllowed: false },
      });
      result = { run: normalizeRun(updated), item, idempotent: false };
      return result.run;
    }

    const item = (checkedRun.operatorBridgeOutbox ?? []).find((bridgeItem) => bridgeItem.id === parsed.bridgeItemId || bridgeItem.handoffId === parsed.handoffId) ?? checkedRun.operatorBridgeOutbox?.[0];
    if (!item) {
      throw new Error("No OpenClaw/operator bridge outbox item exists to update.");
    }
    const transitioned = transitionOperatorBridgeItem(item, {
      action,
      actor: parsed.actor,
      operator: parsed.operator,
      note: parsed.note,
      blockedReason: parsed.blockedReason,
    });
    const operatorBridgeOutbox = (checkedRun.operatorBridgeOutbox ?? []).map((bridgeItem) => bridgeItem.id === item.id ? transitioned : bridgeItem);
    const actionMap: Record<Exclude<OperatorBridgeAction, "prepare">, NonNullable<FactoryRun["auditTrail"]>[number]["action"]> = {
      claim: "operator.bridge.claimed",
      "start-review": "operator.bridge.review-running",
      "complete-review": "operator.bridge.review-completed",
      block: "operator.bridge.blocked",
      cancel: "operator.bridge.cancelled",
      fail: "operator.bridge.failed",
    };
    const updated = appendAudit(normalizeRun({ ...checkedRun, operatorBridgeOutbox }), {
      action: actionMap[action as Exclude<OperatorBridgeAction, "prepare">],
      actor: parsed.actor,
      summary: `OpenClaw/operator bridge outbox item ${action} recorded as ${transitioned.state}; Mission Control performed no external side effects.`,
      metadata: { bridgeItemId: transitioned.id, handoffId: transitioned.handoffId, state: transitioned.state, operator: transitioned.operator ?? null, externalSideEffectsAllowed: false },
    });
    result = { run: normalizeRun(updated), item: transitioned, idempotent: false };
    return result.run;
  });

  if (!result) return null;
  await writeRuns(next);
  return result;
}
