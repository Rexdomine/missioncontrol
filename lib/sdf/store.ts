import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { appendAudit, buildReadiness, buildTaskPacket, buildTimeline, createLaunchRequest, createRun, createSeedRuns, defaultApprovalPolicy, defaultGitHubLiveReadiness, generateId, generateTaskGraph, nowIso } from "./factory";
import { chooseLaunchQueueState, deriveLaunchIdempotencyKey, evaluateApprovalPolicy, stableHash } from "./approval-policy";
import { getGitHubLiveReadiness, readGitHubCheckpoint } from "./github";
import type { BuildIntake, FactoryRun, FactoryRunState, LaunchApprovalState, LaunchQueueJob, SdfRunRegistryResponse } from "./types";

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
    auditTrail: run.auditTrail ?? [],
    prCheckpoint: {
      ...run.prCheckpoint,
      liveReadiness: run.prCheckpoint?.liveReadiness ?? defaultGitHubLiveReadiness,
    },
  };
  return { ...withDefaults, approvalPolicy: evaluateApprovalPolicy(withDefaults) };
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
  return { runs: await readRunsUnsafe(), adapter: getSdfAdapter() };
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

    const launchRequest = { ...request, approvalState, updatedAt: nowIso(), launchReady: policy.state === "approved" || policy.state === "dispatch-ready", nextAction: policy.canDispatchExternalWork ? "Dispatch adapter is ready." : "Queue is prepared, but external dispatch remains blocked by Phase 5 approval/adapter policy." };
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
      dispatchAdapter: "none",
      auditNote: parsed.dispatchRequested
        ? "Dispatch was requested but Phase 5 has no safe external-write adapter; job is retained for Phase 6 readiness."
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
