import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { appendAudit, buildReadiness, buildTimeline, createLaunchRequest, createRun, createSeedRuns, generateTaskGraph, nowIso } from "./factory";
import type { BuildIntake, FactoryRun, FactoryRunState, LaunchApprovalState, SdfRunRegistryResponse } from "./types";

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
    await fs.writeFile(dataFile, JSON.stringify({ runs: createSeedRuns() }, null, 2));
  }
}

async function readRunsUnsafe(): Promise<FactoryRun[]> {
  await ensureStore();
  const raw = await fs.readFile(dataFile, "utf8");
  const parsed = JSON.parse(raw) as { runs?: FactoryRun[] };
  return Array.isArray(parsed.runs) ? parsed.runs : createSeedRuns();
}

async function writeRuns(runs: FactoryRun[]) {
  await fs.mkdir(dataDir, { recursive: true });
  const tmp = `${dataFile}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ runs }, null, 2));
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
  const run = createRun(intake, buildReadiness(intake).every((item) => item.complete) ? "Ready to launch" : "Draft");
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
    updated = appendAudit(
      {
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
      },
      { action: "run.updated", actor: "System", summary: `Run updated${parsed.state ? ` to ${parsed.state}` : ""}.`, metadata: { state } },
    );
    return updated;
  });
  if (!updated) return null;
  await writeRuns(next);
  return updated;
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
  const liveAvailable = Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY);
  const next = runs.map((run) => {
    if (run.id !== id) return run;
    const source = parsed.source === "live" && !liveAvailable ? "manual" : parsed.source;
    updated = appendAudit(
      {
        ...run,
        updatedAt: nowIso(),
        prCheckpoint: {
          ...run.prCheckpoint,
          prUrl: parsed.prUrl ?? run.prCheckpoint.prUrl,
          branch: parsed.branch ?? run.prCheckpoint.branch,
          commit: parsed.commit ?? run.prCheckpoint.commit,
          checkStatus: parsed.checkStatus ?? (source === "live" ? "Pending" : source === "manual" ? "Pending" : "Simulated"),
          reviewState: parsed.reviewState ?? run.prCheckpoint.reviewState,
          blockers: parsed.blockers ?? (parsed.source === "live" && !liveAvailable ? ["GitHub live sync requires GITHUB_TOKEN and GITHUB_REPOSITORY in the server runtime."] : run.prCheckpoint.blockers),
          nextAction:
            parsed.nextAction ??
            (parsed.source === "live" && !liveAvailable
              ? "Configure GitHub server credentials before enabling live sync; manual checkpoint data was recorded instead."
              : "Review the latest checkpoint state before launch or PR handoff."),
          liveSync: source === "live" && liveAvailable,
          syncSource: source,
          lastCheckedAt: nowIso(),
        },
      },
      { action: "sync.updated", actor: "System", summary: `Checkpoint sync recorded from ${source} source.`, metadata: { requestedSource: parsed.source, liveAvailable } },
    );
    return updated;
  });
  if (!updated) return null;
  await writeRuns(next);
  return updated;
}

export async function prepareLaunchRequest(id: string, body: unknown): Promise<FactoryRun | null> {
  const parsed = z.object({ approvalNote: z.string().optional(), approvalState: approvalSchema.optional() }).parse(body ?? {});
  const runs = await readRunsUnsafe();
  let updated: FactoryRun | null = null;
  const next = runs.map((run) => {
    if (run.id !== id) return run;
    const request = createLaunchRequest(run, parsed.approvalNote);
    const approvalState: LaunchApprovalState = parsed.approvalState ?? request.approvalState;
    const launchRequest = { ...request, approvalState, updatedAt: nowIso() };
    updated = appendAudit(
      { ...run, updatedAt: nowIso(), launchRequests: [launchRequest, ...(run.launchRequests ?? [])] },
      {
        action: approvalState === "approved" ? "approval.changed" : "launch.prepared",
        actor: "System",
        summary: approvalState === "approved" ? "Rex approval state recorded for prepared launch packet." : "Launch packet prepared; no real agent was started.",
        metadata: { approvalState, launchReady: launchRequest.launchReady },
      },
    );
    return updated;
  });
  if (!updated) return null;
  await writeRuns(next);
  return updated;
}
