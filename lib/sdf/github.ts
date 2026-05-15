import "server-only";

import type { CheckStatus, GitHubLiveReadiness, ReviewState } from "./types";

const GITHUB_API = "https://api.github.com";

type GitHubPrResponse = {
  html_url: string;
  number: number;
  state: string;
  draft?: boolean;
  merged?: boolean;
  head: { ref: string; sha: string };
  base: { repo: { full_name: string } };
  requested_reviewers?: unknown[];
  review_comments?: number;
};

type GitHubChecksResponse = {
  total_count?: number;
  check_runs?: Array<{ status?: string; conclusion?: string | null }>;
};

export type GitHubSyncInput = {
  prUrl?: string;
  branch?: string;
  commit?: string;
};

export type GitHubSyncResult = {
  source: "live" | "manual" | "simulated";
  liveReadiness: GitHubLiveReadiness;
  prUrl: string;
  branch: string;
  commit: string;
  checkStatus: CheckStatus;
  reviewState: ReviewState;
  blockers: string[];
  nextAction: string;
};

function envToken() {
  return process.env.SDF_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";
}

export function getGitHubLiveReadiness(error = ""): GitHubLiveReadiness {
  const tokenConfigured = Boolean(envToken());
  const repository = process.env.SDF_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY || "";
  const configured = tokenConfigured && Boolean(repository);
  return {
    status: configured ? "configured" : "not-configured",
    configured,
    repository,
    tokenConfigured,
    permissions: "Read-only GitHub REST API access: pull_requests:read and checks/statuses read. No pushes, comments, workflow dispatches, or mutations are used.",
    blocker: configured ? "" : "Live GitHub sync needs server-only SDF_GITHUB_TOKEN (or GITHUB_TOKEN) and SDF_GITHUB_REPOSITORY (or GITHUB_REPOSITORY).",
    lastError: error,
  };
}

export function parsePrReference(prUrl = "", repository = process.env.SDF_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY || "") {
  const match = prUrl.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/i);
  if (match) return { repository: match[1], pullNumber: Number(match[2]) };
  const envPr = process.env.SDF_GITHUB_PR_NUMBER ? Number(process.env.SDF_GITHUB_PR_NUMBER) : 0;
  return { repository, pullNumber: Number.isFinite(envPr) ? envPr : 0 };
}

async function githubGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "mission-control-sdf-readonly-sync",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub read failed ${response.status}: ${text.slice(0, 180)}`);
  }
  return (await response.json()) as T;
}

function mapCheckStatus(checks: GitHubChecksResponse): CheckStatus {
  const runs = checks.check_runs ?? [];
  if (!runs.length) return "Pending";
  if (runs.some((run) => run.conclusion && !["success", "neutral", "skipped"].includes(run.conclusion))) return "Failing";
  if (runs.some((run) => run.status !== "completed" || !run.conclusion)) return "Pending";
  return "Passing";
}

function mapReviewState(pr: GitHubPrResponse): ReviewState {
  if (pr.merged) return "Approved";
  if (pr.draft || pr.state !== "open") return "Not requested";
  return "Needs Rex";
}

export async function readGitHubCheckpoint(input: GitHubSyncInput): Promise<GitHubSyncResult> {
  const token = envToken();
  const requested = parsePrReference(input.prUrl);
  const readiness = getGitHubLiveReadiness();
  if (!readiness.configured || !requested.repository || !requested.pullNumber) {
    return {
      source: "manual",
      liveReadiness: readiness,
      prUrl: input.prUrl ?? "",
      branch: input.branch ?? "",
      commit: input.commit ?? "pending",
      checkStatus: "Not connected",
      reviewState: "Needs Rex",
      blockers: [readiness.blocker || "Live GitHub sync needs a PR URL or SDF_GITHUB_PR_NUMBER."],
      nextAction: "Record a manual checkpoint or configure read-only GitHub env before trusting live status.",
    };
  }

  try {
    const pr = await githubGet<GitHubPrResponse>(`/repos/${requested.repository}/pulls/${requested.pullNumber}`, token);
    const sha = pr.head.sha || input.commit || "pending";
    const checks = await githubGet<GitHubChecksResponse>(`/repos/${requested.repository}/commits/${sha}/check-runs`, token);
    return {
      source: "live",
      liveReadiness: getGitHubLiveReadiness(),
      prUrl: pr.html_url,
      branch: pr.head.ref || input.branch || "",
      commit: sha,
      checkStatus: mapCheckStatus(checks),
      reviewState: mapReviewState(pr),
      blockers: [],
      nextAction: "Live GitHub PR/check status was read safely. Continue review or queue launch only through approval policy.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown GitHub sync error";
    return {
      source: "manual",
      liveReadiness: getGitHubLiveReadiness(message),
      prUrl: input.prUrl ?? "",
      branch: input.branch ?? "",
      commit: input.commit ?? "pending",
      checkStatus: "Not connected",
      reviewState: "Needs Rex",
      blockers: [`Live GitHub read failed: ${message}`],
      nextAction: "Use manual checkpoint data until the read-only GitHub adapter can reach the PR/check endpoints.",
    };
  }
}
