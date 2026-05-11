#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readOpenClawApiKey, validateLiveConfig } from "../lib/job-outreach/runtime-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { jobOutreachTabs } = JSON.parse(fs.readFileSync(path.join(__dirname, "../lib/job-outreach/sheet-schema.json"), "utf8"));

const SHEETS_BASE = "https://gateway.maton.ai/google-sheets/v4";

function quoteSheetName(name) { return `'${name.replaceAll("'", "''")}'`; }
function rowValue(row, index) { return String(row[index] || "").trim(); }
function normalize(value) { return String(value || "").trim().toLowerCase(); }
function extractQueueId(notes = "") { return /(?:^|;\s*)queue_id=([^;]+)/i.exec(String(notes))?.[1]?.trim() || ""; }
function dateOnly(value) { return String(value || "").slice(0, 10); }
function addDaysIso(isoDate, days) {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function requestJson(url) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${readOpenClawApiKey()}` } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function readRows(spreadsheetId, tab) {
  const data = await requestJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${quoteSheetName(tab)}!A1:Z`)}`);
  return data.values || [];
}

function issue(issues, severity, area, message, evidence = {}) {
  issues.push({ severity, area, message, evidence });
}

const { config, missing } = validateLiveConfig({ allowMissingSourcingKeys: true });
if (missing.length) throw new Error(`Missing required live config: ${missing.join(", ")}`);

const tabs = Object.fromEntries(await Promise.all(jobOutreachTabs.map(async (tab) => [tab.name, await readRows(config.spreadsheetId, tab.name)])));
const issues = [];
const expectedTabs = new Map(jobOutreachTabs.map((tab) => [tab.name, tab.columns]));

for (const [tabName, expectedColumns] of expectedTabs.entries()) {
  const header = tabs[tabName]?.[0] || [];
  if (!header.length) {
    issue(issues, "critical", "schema", `${tabName} tab is missing or has no header row`);
    continue;
  }
  if (expectedColumns.length !== header.length || expectedColumns.some((column, index) => column !== header[index])) {
    issue(issues, "high", "schema", `${tabName} header does not match expected schema`, { expectedColumns, actualHeader: header });
  }
}

const leads = (tabs.Leads || []).slice(1);
const leadById = new Map(leads.map((row) => [rowValue(row, 0), row]));
for (const row of leads) {
  const id = rowValue(row, 0);
  const fullName = rowValue(row, 5);
  const email = rowValue(row, 6);
  if (!fullName || !email) issue(issues, "critical", "lead-quality", "Leads contains a non-contact-ready row", { leadId: id, fullName: Boolean(fullName), email: Boolean(email) });
}

const queueRows = (tabs["Outreach Queue"] || []).slice(1);
const emailRows = (tabs["Email Activity"] || []).slice(1);
const followUpRows = (tabs["Follow Ups"] || []).slice(1);
const suppressionRows = (tabs["Suppression List"] || []).slice(1);
const replyRows = (tabs.Replies || []).slice(1);
const interviewRows = (tabs.Interviews || []).slice(1);
const suppressed = new Set(suppressionRows.map((row) => normalize(row[0])).filter(Boolean));
const emailActivityByQueueId = new Map(emailRows.map((row) => [extractQueueId(rowValue(row, 9)), row]).filter(([queueId]) => queueId));
const followUpsByLeadAndNumber = new Map(followUpRows.map((row) => [`${rowValue(row, 1)}|${rowValue(row, 2)}`, row]));
const repliesByLead = new Map();
for (const row of replyRows) {
  const leadId = rowValue(row, 1);
  if (!leadId) continue;
  if (!repliesByLead.has(leadId)) repliesByLead.set(leadId, []);
  repliesByLead.get(leadId).push(row);
}
const interviewsByLead = new Map(interviewRows.map((row) => [rowValue(row, 1), row]).filter(([leadId]) => leadId));

for (const row of queueRows) {
  const queueId = rowValue(row, 0);
  const leadId = rowValue(row, 1);
  const approval = rowValue(row, 6);
  const sendMode = rowValue(row, 7);
  const scheduledOrSentAt = rowValue(row, 8);
  const sentStatus = rowValue(row, 9);
  const errorMessage = rowValue(row, 10);
  const lead = leadById.get(leadId);
  if (approval === "Approved" && sendMode !== "Send on Approval" && sentStatus !== "Sent") {
    issue(issues, "high", "queue", "Approved row is not configured to send", { queueId, sendMode });
  }
  if (approval === "Approved" && sentStatus === "Sent") {
    const emailActivity = emailActivityByQueueId.get(queueId);
    if (!scheduledOrSentAt) issue(issues, "high", "queue", "Sent queue row is missing sent timestamp", { queueId });
    if (errorMessage) issue(issues, "medium", "queue", "Sent queue row has Error Message populated", { queueId, errorMessage });
    if (!emailActivity) issue(issues, "critical", "email-activity", "Sent queue row has no Email Activity record", { queueId });
    if (lead && suppressed.has(normalize(lead[6]))) issue(issues, "critical", "suppression", "Sent lead is on suppression list", { queueId, leadId });
  }
}

for (const row of replyRows) {
  const replyId = rowValue(row, 0);
  const leadId = rowValue(row, 1);
  const fromEmail = rowValue(row, 2);
  const classification = rowValue(row, 5);
  const nextAction = rowValue(row, 7);
  const lead = leadById.get(leadId);
  if (!lead) issue(issues, "high", "replies", "Reply row references missing lead", { replyId, leadId });
  if (!fromEmail) issue(issues, "medium", "replies", "Reply row is missing From Email", { replyId, leadId });
  if (!classification) issue(issues, "medium", "replies", "Reply row is missing classification", { replyId, leadId });
  if (!nextAction) issue(issues, "medium", "replies", "Reply row is missing next action", { replyId, leadId });
  if (classification === "Not Interested" && lead && !suppressed.has(normalize(lead[6]))) issue(issues, "high", "suppression", "Opt-out/not-interested reply is not in suppression list", { replyId, leadId, email: rowValue(lead, 6) });
  if (classification === "Positive" && !interviewsByLead.has(leadId)) issue(issues, "medium", "interviews", "Positive reply has not been moved to interview/scheduling tracker", { replyId, leadId });
}

for (const row of followUpRows) {
  const followUpId = rowValue(row, 0);
  const leadId = rowValue(row, 1);
  const status = rowValue(row, 4);
  const replies = repliesByLead.get(leadId) || [];
  if (replies.length && /^pending$/i.test(status)) issue(issues, "high", "follow-up", "Lead has replied but follow-up remains pending", { followUpId, leadId, replies: replies.length });
}

for (const row of emailRows) {
  const activityId = rowValue(row, 0);
  const leadId = rowValue(row, 1);
  const email = rowValue(row, 2);
  const emailType = rowValue(row, 3) || "Initial";
  const sentDate = rowValue(row, 5);
  const gmailMessageId = rowValue(row, 6);
  const status = rowValue(row, 7);
  const followUpDueDate = rowValue(row, 8);
  const queueId = extractQueueId(rowValue(row, 9));
  if (status === "Sent") {
    if (!sentDate) issue(issues, "critical", "email-activity", "Sent Email Activity row is missing Sent Date", { activityId });
    if (!gmailMessageId) issue(issues, "critical", "email-activity", "Sent Email Activity row is missing Gmail Message ID", { activityId });
    if (!followUpDueDate) issue(issues, "critical", "follow-up", "Sent Email Activity row is missing Follow-up Due Date", { activityId, leadId, queueId });
    if (emailType.toLowerCase() === "initial") {
      const expectedDue = sentDate ? addDaysIso(sentDate, Number(process.env.JOB_OUTREACH_FIRST_FOLLOW_UP_DAYS || 3)) : "";
      const followUp = followUpsByLeadAndNumber.get(`${leadId}|1`);
      if (!followUp) issue(issues, "high", "follow-up", "Sent initial email has no Follow Ups row", { activityId, leadId, expectedDue });
      else if (dateOnly(rowValue(followUp, 3)) !== expectedDue) issue(issues, "medium", "follow-up", "Follow Ups due date does not match Email Activity due date", { leadId, expectedDue, actual: rowValue(followUp, 3) });
    }
    if (suppressed.has(normalize(email))) issue(issues, "critical", "suppression", "Sent email is on suppression list", { activityId, email });
  }
}

const dailyMetrics = (tabs["Daily Metrics"] || []).slice(1);
for (const [index, row] of dailyMetrics.entries()) {
  if (row.length < 13) issue(issues, "medium", "metrics", "Daily Metrics row has fewer columns than expected", { rowNumber: index + 2, columns: row.length });
}
const emailsSentToday = emailRows.filter((row) => rowValue(row, 7) === "Sent" && dateOnly(rowValue(row, 5)) === new Date().toISOString().slice(0, 10)).length;
const todayMetric = dailyMetrics.find((row) => rowValue(row, 0) === new Date().toISOString().slice(0, 10));
if (todayMetric && Number(rowValue(todayMetric, 5) || 0) < emailsSentToday) {
  issue(issues, "medium", "metrics", "Daily Metrics Emails Sent is lower than Email Activity sent count for today", { metric: rowValue(todayMetric, 5), emailActivitySentToday: emailsSentToday });
}

const report = {
  ok: !issues.some((item) => ["critical", "high"].includes(item.severity)),
  spreadsheetId: `${config.spreadsheetId.slice(0, 4)}…${config.spreadsheetId.slice(-4)}`,
  mode: config.mode,
  counts: {
    hiringSignals: Math.max(0, (tabs["Hiring Signals"] || []).length - 1),
    leads: leads.length,
    queue: queueRows.length,
    emailActivity: emailRows.length,
    followUps: followUpRows.length,
    replies: replyRows.length,
    interviews: interviewRows.length,
    suppression: suppressionRows.length,
  },
  issues,
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
