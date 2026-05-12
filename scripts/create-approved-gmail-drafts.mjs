#!/usr/bin/env node

import crypto from "node:crypto";
import { buildInitialDraft, greetingName, reviewOutreachDraft } from "../lib/job-outreach/templates.mjs";
import { getJobOutreachConfig, readOpenClawApiKey, validateLiveConfig } from "../lib/job-outreach/runtime-config.mjs";

const SHEETS_BASE = "https://gateway.maton.ai/google-sheets/v4";
const GMAIL_BASE = "https://gateway.maton.ai/google-mail/gmail/v1";
const SEND_MODE = "Send on Approval";
const SENT_QUEUE_STATUSES = new Set(["sent"]);

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
function todayDate(iso = nowIso()) { return iso.slice(0, 10); }
function addDaysIso(isoDate, days) {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function encodeBase64Url(value) { return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function escapeHeader(value) { return String(value || "").replace(/\r?\n/g, " ").trim(); }
function rowValue(row, index) { return String(row[index] || "").trim(); }
function ensureLength(row, length) {
  const next = [...row];
  while (next.length < length) next.push("");
  return next;
}
function parseNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}
function extractQueueId(notes = "") {
  return /(?:^|;\s*)queue_id=([^;]+)/i.exec(String(notes))?.[1]?.trim() || "";
}
function ensureCvLink(body, resumeUrl) {
  if (!resumeUrl) throw new Error("Missing JOB_OUTREACH_RESUME_URL; refusing to process outreach without a CV link.");
  if (/CV:\s*https?:\/\/|resume:\s*https?:\/\//i.test(body)) return body;
  return String(body || "").replace("\n\nBest,", `\n\nCV: ${resumeUrl}\n\nBest,`);
}
function buildMimeMessage({ to, from, subject, text, resumeUrl }) {
  return [`To: ${escapeHeader(to)}`, `From: ${escapeHeader(from)}`, `Subject: ${escapeHeader(subject)}`, 'Content-Type: text/plain; charset="UTF-8"', "MIME-Version: 1.0", "", ensureCvLink(text, resumeUrl), ""].join("\r\n");
}
function buildFollowUpBody({ firstName, company, resumeUrl }) {
  const safeFirstName = greetingName({ firstName });
  const safeCompany = company || "your team";
  const reviewed = reviewOutreachDraft({
    subject: `Following up on AI/full-stack engineering support for ${safeCompany}`,
    body: ensureCvLink(`Hi ${safeFirstName},\n\nJust following up on my note about AI/full-stack engineering support for ${safeCompany}.\n\nI think my background across React, Python/FastAPI, AI workflows, automation, integrations, and shipping production systems could be useful if your team needs someone who can move quickly from idea to working software.\n\nWould it be worth a quick conversation this week?\n\nBest,\nPrincewill Ejiogu\n\nP.S. If this is not relevant, feel free to let me know and I won’t follow up.`, resumeUrl),
  }, { firstName, resumeUrl });
  return reviewed.body;
}
function leadFromRow(row) {
  return {
    id: rowValue(row, 0),
    source: rowValue(row, 2),
    firstName: rowValue(row, 3),
    lastName: rowValue(row, 4),
    fullName: rowValue(row, 5),
    email: rowValue(row, 6),
    title: rowValue(row, 8),
    company: rowValue(row, 9),
    hiringSignal: rowValue(row, 14),
    techSignal: rowValue(row, 15),
    personalizationAngle: rowValue(row, 16),
    status: rowValue(row, 18),
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

async function sendMessage({ to, from, subject, body, resumeUrl }) {
  const raw = encodeBase64Url(buildMimeMessage({ to, from, subject, text: body, resumeUrl }));
  return requestJson(`${GMAIL_BASE}/users/me/messages/send`, { method: "POST", body: { raw } });
}

async function incrementDailyMetric(spreadsheetId, metricDate, columnIndex, amount) {
  const rows = await readRows(spreadsheetId, `${quoteSheetName("Daily Metrics")}!A2:M`);
  const rowIndex = rows.findIndex((row) => rowValue(row, 0) === metricDate);
  if (rowIndex === -1) {
    const metricRow = [metricDate, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "Queue processor", "Created by queue processor"];
    metricRow[columnIndex] = amount;
    await appendRows(spreadsheetId, "Daily Metrics", [metricRow]);
    return;
  }
  const row = ensureLength(rows[rowIndex], 13);
  row[columnIndex] = parseNumber(row[columnIndex]) + amount;
  await putRows(spreadsheetId, `${quoteSheetName("Daily Metrics")}!A${rowIndex + 2}:M${rowIndex + 2}`, [row]);
}

const args = parseArgs(process.argv.slice(2));
const commit = Boolean(args.commit);
const max = Number(args.max || 25);
const { missing } = validateLiveConfig({ allowMissingSourcingKeys: true });
if (missing.length) throw new Error(`Missing required live config: ${missing.join(", ")}`);
const config = getJobOutreachConfig();
const firstFollowUpDays = Number(process.env.JOB_OUTREACH_FIRST_FOLLOW_UP_DAYS || 3);
if (config.mode !== "approved_send") throw new Error(`Refusing automatic send while JOB_OUTREACH_MODE is ${config.mode}; set approved_send only when approved rows should send.`);
if (!config.resumeUrl) throw new Error("Missing JOB_OUTREACH_RESUME_URL; upload the CV to Drive and configure the share link before processing outreach.");

const [leadRows, queueRows, suppressionRows, emailActivityRows, followUpRows] = await Promise.all([
  readRows(config.spreadsheetId, `${quoteSheetName("Leads")}!A2:W`),
  readRows(config.spreadsheetId, `${quoteSheetName("Outreach Queue")}!A2:K`),
  readRows(config.spreadsheetId, `${quoteSheetName("Suppression List")}!A2:E`),
  readRows(config.spreadsheetId, `${quoteSheetName("Email Activity")}!A2:J`),
  readRows(config.spreadsheetId, `${quoteSheetName("Follow Ups")}!A2:H`),
]);
const leadsById = new Map(leadRows.map((row) => [row[0], leadFromRow(row)]));
const suppressed = new Set(suppressionRows.map((row) => rowValue(row, 0).toLowerCase()).filter(Boolean));
const sentQueueIds = new Set(emailActivityRows.map((row) => extractQueueId(rowValue(row, 9))).filter(Boolean));
const existingFirstFollowUps = new Set(followUpRows.map((row) => `${rowValue(row, 1)}|${rowValue(row, 2)}`));
const sentToday = emailActivityRows.filter((row) => rowValue(row, 7) === "Sent" && rowValue(row, 5).startsWith(todayDate())).length;
const dailySendBudget = Math.max(0, Math.min(max, config.dailySendLimit - sentToday));
const results = [];
const queueUpdates = [];
const emailActivity = [];
const followUps = [];
const activity = [];
let processed = 0;
let sentCount = 0;

function queueUpdate(rowNumber, row, patch) {
  const next = ensureLength(row, 11);
  for (const [index, value] of Object.entries(patch)) next[Number(index)] = value;
  queueUpdates.push({ rowNumber, row: next });
}

const prioritizedQueueRows = queueRows
  .map((row, index) => ({ row, index }))
  .sort((a, b) => {
    const aApproval = rowValue(a.row, 6);
    const bApproval = rowValue(b.row, 6);
    if (aApproval === "Needs Rewrite" && bApproval !== "Needs Rewrite") return -1;
    if (bApproval === "Needs Rewrite" && aApproval !== "Needs Rewrite") return 1;
    return a.index - b.index;
  });

for (const { row, index } of prioritizedQueueRows) {
  if (processed >= max) break;
  const rowNumber = index + 2;
  const item = {
    queueId: rowValue(row, 0),
    leadId: rowValue(row, 1),
    priority: rowValue(row, 2),
    emailType: rowValue(row, 3) || "Initial",
    subject: rowValue(row, 4),
    body: rowValue(row, 5),
    approval: rowValue(row, 6),
    sendMode: rowValue(row, 7),
    scheduledAt: rowValue(row, 8),
    sentStatus: rowValue(row, 9),
  };
  const lead = leadsById.get(item.leadId);
  if (!item.queueId || !["Approved", "Needs Rewrite"].includes(item.approval)) continue;
  if (SENT_QUEUE_STATUSES.has(item.sentStatus.toLowerCase())) continue;

  if (sentQueueIds.has(item.queueId)) {
    queueUpdate(rowNumber, row, { 9: "Sent", 10: "" });
    activity.push(activityRow("Queue Sync", "Gmail", lead?.company || item.leadId, "Synced", `queue_id=${item.queueId}; already present in Email Activity`));
    results.push({ queueId: item.queueId, action: commit ? "synced_existing_send" : "would_sync_existing_send" });
    processed += 1;
    continue;
  }

  if (item.approval === "Needs Rewrite") {
    if (!lead) {
      queueUpdate(rowNumber, row, { 9: "Error", 10: "Cannot rewrite: lead is missing from Leads tab" });
      activity.push(activityRow("Queue Error", "Google Sheets", item.leadId, "Error", `queue_id=${item.queueId}; missing_lead_for_rewrite`));
      results.push({ queueId: item.queueId, skipped: "missing_lead_for_rewrite" });
      processed += 1;
      continue;
    }
    const draft = buildInitialDraft({ firstName: lead.firstName, fullName: lead.fullName, email: lead.email, company: lead.company, title: lead.title, angle: lead.personalizationAngle || lead.hiringSignal, resumeUrl: config.resumeUrl });
    const rewrittenRow = ensureLength(row, 11);
    rewrittenRow[4] = draft.subject;
    rewrittenRow[5] = draft.body;
    rewrittenRow[6] = "Pending";
    rewrittenRow[7] = SEND_MODE;
    rewrittenRow[8] = "";
    rewrittenRow[9] = "Not Sent";
    rewrittenRow[10] = "";
    queueUpdates.push({ rowNumber, row: rewrittenRow });
    activity.push(activityRow("Draft Rewritten", "Google Sheets", lead.company, "Pending Review", `queue_id=${item.queueId}; lead_id=${lead.id}`));
    results.push({ queueId: item.queueId, action: commit ? "rewritten_to_pending" : "would_rewrite_to_pending" });
    processed += 1;
    continue;
  }

  if (!lead?.email) {
    queueUpdate(rowNumber, row, { 9: "Error", 10: "Cannot send: lead is missing or has no email" });
    activity.push(activityRow("Queue Error", "Google Sheets", item.leadId, "Error", `queue_id=${item.queueId}; missing_lead_email`));
    results.push({ queueId: item.queueId, skipped: "missing_lead_email" });
    processed += 1;
    continue;
  }
  if (suppressed.has(lead.email.toLowerCase())) {
    queueUpdate(rowNumber, row, { 9: "Blocked", 10: "Suppression list match; email was not sent" });
    activity.push(activityRow("Suppression Block", "Suppression List", lead.email, "Blocked", `queue_id=${item.queueId}; lead_id=${lead.id}`));
    results.push({ queueId: item.queueId, skipped: "suppressed" });
    processed += 1;
    continue;
  }
  if (item.sendMode !== SEND_MODE) {
    queueUpdate(rowNumber, row, { 9: "Blocked", 10: `Send Mode must be '${SEND_MODE}'` });
    activity.push(activityRow("Queue Block", "Google Sheets", lead.company, "Blocked", `queue_id=${item.queueId}; send_mode=${item.sendMode || "blank"}`));
    results.push({ queueId: item.queueId, skipped: "send_mode_not_send_on_approval" });
    processed += 1;
    continue;
  }
  if (sentCount >= dailySendBudget) {
    results.push({ queueId: item.queueId, skipped: "daily_send_limit_reached", dailySendLimit: config.dailySendLimit, sentToday });
    break;
  }

  const reviewedDraft = reviewOutreachDraft({ subject: item.subject, body: item.body }, { firstName: lead.firstName, fullName: lead.fullName, email: lead.email, resumeUrl: config.resumeUrl });
  const reviewIssues = reviewedDraft.review?.issues || [];
  if (reviewedDraft.body !== item.body || reviewedDraft.subject !== item.subject) {
    queueUpdate(rowNumber, row, { 4: reviewedDraft.subject, 5: reviewedDraft.body, 10: reviewIssues.length ? `Auto-reviewed before send: ${reviewIssues.join(", ")}` : "Auto-reviewed before send" });
    item.subject = reviewedDraft.subject;
    item.body = reviewedDraft.body;
  }
  activity.push(activityRow("Draft Review", "Outreach Template", lead.company, reviewedDraft.review?.status === "passed" ? "Passed" : "Needs Manual Review", `queue_id=${item.queueId}; issues=${reviewIssues.length ? reviewIssues.join(",") : "none"}`));
  if (reviewedDraft.review?.status !== "passed") {
    queueUpdate(rowNumber, row, { 6: "Needs Rewrite", 9: "Blocked", 10: `Draft review blocked send: ${reviewIssues.join(", ")}` });
    results.push({ queueId: item.queueId, skipped: "draft_review_failed", issues: reviewIssues });
    processed += 1;
    continue;
  }

  if (!commit) {
    const followUpDueDate = addDaysIso(nowIso(), firstFollowUpDays);
    results.push({ queueId: item.queueId, to: lead.email, dryRun: true, action: "would_send", cvLink: "present", followUpDueDate });
    processed += 1;
    sentCount += 1;
    continue;
  }

  const sent = await sendMessage({ to: lead.email, from: `${config.senderName} <${config.senderEmail}>`, subject: item.subject, body: item.body, resumeUrl: config.resumeUrl });
  const messageId = sent.id || "sent";
  const sentAt = nowIso();
  const followUpDueDate = addDaysIso(sentAt, firstFollowUpDays);
  queueUpdate(rowNumber, row, { 8: sentAt, 9: "Sent", 10: "" });
  emailActivity.push([`email_${crypto.randomUUID()}`, lead.id, lead.email, item.emailType, item.subject, sentAt, messageId, "Sent", followUpDueDate, `queue_id=${item.queueId}; cv_link=present; first_follow_up_days=${firstFollowUpDays}`]);
  if (item.emailType.toLowerCase() === "initial" && !existingFirstFollowUps.has(`${lead.id}|1`)) {
    followUps.push([`follow_${crypto.randomUUID()}`, lead.id, 1, followUpDueDate, "Pending", "No reply to initial outreach", buildFollowUpBody({ firstName: lead.firstName, company: lead.company, resumeUrl: config.resumeUrl }), "Pending"]);
    existingFirstFollowUps.add(`${lead.id}|1`);
  }
  activity.push(activityRow("Email Sent", "Gmail", lead.email, "Sent", `queue_id=${item.queueId}; gmail_message_id=${messageId}; follow_up_due=${followUpDueDate}; cv_link=present`));
  results.push({ queueId: item.queueId, to: lead.email, messageId, action: "sent", cvLink: "present", followUpDueDate });
  processed += 1;
  sentCount += 1;
}

if (commit) {
  for (const update of queueUpdates) {
    await putRows(config.spreadsheetId, `${quoteSheetName("Outreach Queue")}!A${update.rowNumber}:K${update.rowNumber}`, [update.row]);
  }
  await appendRows(config.spreadsheetId, "Email Activity", emailActivity);
  await appendRows(config.spreadsheetId, "Follow Ups", followUps);
  await appendRows(config.spreadsheetId, "Activity Log", activity);
  if (sentCount) await incrementDailyMetric(config.spreadsheetId, todayDate(), 5, sentCount);
}

console.log(JSON.stringify({ commit, processed, sent: sentCount, dailySendBudget, results }, null, 2));
