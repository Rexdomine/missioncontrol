#!/usr/bin/env node

import crypto from "node:crypto";
import { reviewOutreachDraft } from "../lib/job-outreach/templates.mjs";
import { getJobOutreachConfig, readOpenClawApiKey, validateLiveConfig } from "../lib/job-outreach/runtime-config.mjs";

const SHEETS_BASE = "https://gateway.maton.ai/google-sheets/v4";
const REVIEWABLE_APPROVALS = new Set(["Pending", "Approved", "Needs Rewrite"]);
const SENT_STATUSES = new Set(["sent"]);

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { args._.push(arg); continue; }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else { args[key] = next; i += 1; }
  }
  return args;
}

function quoteSheetName(name) { return `'${name.replaceAll("'", "''")}'`; }
function nowIso() { return new Date().toISOString(); }
function rowValue(row, index) { return String(row[index] || "").trim(); }
function ensureLength(row, length) {
  const next = [...row];
  while (next.length < length) next.push("");
  return next;
}
function leadFromRow(row) {
  return {
    id: rowValue(row, 0),
    firstName: rowValue(row, 3),
    lastName: rowValue(row, 4),
    fullName: rowValue(row, 5),
    email: rowValue(row, 6),
    title: rowValue(row, 8),
    company: rowValue(row, 9),
    hiringSignal: rowValue(row, 14),
    personalizationAngle: rowValue(row, 16),
  };
}
function activityRow(type, provider, entity, status, notes) {
  return [`activity_${crypto.randomUUID()}`, nowIso(), type, provider, entity, status, notes];
}

async function requestJson(url, { method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${readOpenClawApiKey()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text}`);
  return data;
}

async function readRows(spreadsheetId, range) {
  const data = await requestJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  return data.values || [];
}

async function putRows(spreadsheetId, range, rows) {
  return requestJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, { method: "PUT", body: { values: rows } });
}

async function appendRows(spreadsheetId, tab, rows) {
  if (!rows.length) return { updates: { updatedRows: 0 } };
  return requestJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${quoteSheetName(tab)}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: "POST", body: { values: rows } });
}

const args = parseArgs(process.argv.slice(2));
const commit = Boolean(args.commit);
const max = Number(args.max || 100);
const { missing } = validateLiveConfig({ allowMissingSourcingKeys: true });
if (missing.length) throw new Error(`Missing required live config: ${missing.join(", ")}`);
const config = getJobOutreachConfig();
if (!config.resumeUrl) throw new Error("Missing JOB_OUTREACH_RESUME_URL; refusing to review outreach without a CV link.");

const [leadRows, queueRows] = await Promise.all([
  readRows(config.spreadsheetId, `${quoteSheetName("Leads")}!A2:W`),
  readRows(config.spreadsheetId, `${quoteSheetName("Outreach Queue")}!A2:K`),
]);
const leadsById = new Map(leadRows.map((row) => [rowValue(row, 0), leadFromRow(row)]));
const updates = [];
const activity = [];
const results = [];

for (let index = 0; index < queueRows.length && results.length < max; index += 1) {
  const row = ensureLength(queueRows[index], 11);
  const rowNumber = index + 2;
  const queueId = rowValue(row, 0);
  const leadId = rowValue(row, 1);
  const approval = rowValue(row, 6) || "Pending";
  const sentStatus = rowValue(row, 9);
  if (!queueId || !REVIEWABLE_APPROVALS.has(approval) || SENT_STATUSES.has(sentStatus.toLowerCase())) continue;
  const lead = leadsById.get(leadId);
  if (!lead) {
    row[9] = "Blocked";
    row[10] = "Draft review blocked: lead is missing from Leads tab";
    updates.push({ rowNumber, row });
    activity.push(activityRow("Draft Review", "Outreach Template", leadId, "Blocked", `queue_id=${queueId}; missing_lead`));
    results.push({ queueId, status: "blocked", reason: "missing_lead" });
    continue;
  }

  const reviewed = reviewOutreachDraft({ subject: rowValue(row, 4), body: rowValue(row, 5) }, { firstName: lead.firstName, fullName: lead.fullName, email: lead.email, resumeUrl: config.resumeUrl });
  const issues = reviewed.review?.issues || [];
  const changed = reviewed.subject !== rowValue(row, 4) || reviewed.body !== rowValue(row, 5) || issues.length > 0;
  if (!changed) continue;

  row[4] = reviewed.subject;
  row[5] = reviewed.body;
  if (reviewed.review?.status !== "passed") {
    row[6] = "Needs Rewrite";
    row[9] = "Blocked";
    row[10] = `Draft review needs manual check: ${issues.join(", ")}`;
  } else {
    row[10] = issues.length ? `Auto-reviewed: ${issues.join(", ")}` : "Auto-reviewed";
  }
  updates.push({ rowNumber, row });
  activity.push(activityRow("Draft Review", "Outreach Template", lead.company, reviewed.review?.status === "passed" ? "Passed" : "Needs Manual Review", `queue_id=${queueId}; lead_id=${lead.id}; issues=${issues.length ? issues.join(",") : "none"}`));
  results.push({ queueId, status: reviewed.review?.status || "passed", issues, changed: true });
}

if (commit) {
  for (const update of updates) {
    await putRows(config.spreadsheetId, `${quoteSheetName("Outreach Queue")}!A${update.rowNumber}:K${update.rowNumber}`, [update.row]);
  }
  await appendRows(config.spreadsheetId, "Activity Log", activity);
}

console.log(JSON.stringify({ commit, reviewed: results.length, updated: updates.length, results }, null, 2));
