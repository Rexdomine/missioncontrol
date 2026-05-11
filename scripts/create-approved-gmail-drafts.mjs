#!/usr/bin/env node

import crypto from "node:crypto";
import { buildInitialDraft } from "../lib/job-outreach/templates.mjs";
import { getJobOutreachConfig, readOpenClawApiKey, validateLiveConfig } from "../lib/job-outreach/runtime-config.mjs";

const SHEETS_BASE = "https://gateway.maton.ai/google-sheets/v4";
const GMAIL_BASE = "https://gateway.maton.ai/google-mail/gmail/v1";
const SEND_MODE = "Send on Approval";

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
function encodeBase64Url(value) { return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function escapeHeader(value) { return String(value || "").replace(/\r?\n/g, " ").trim(); }
function rowValue(row, index) { return String(row[index] || "").trim(); }
function ensureCvLink(body, resumeUrl) {
  if (!resumeUrl) throw new Error("Missing JOB_OUTREACH_RESUME_URL; refusing to process outreach without a CV link.");
  if (/CV:\s*https?:\/\/|resume:\s*https?:\/\//i.test(body)) return body;
  return String(body || "").replace("\n\nBest,", `\n\nCV: ${resumeUrl}\n\nBest,`);
}
function buildMimeMessage({ to, from, subject, text, resumeUrl }) {
  return [`To: ${escapeHeader(to)}`, `From: ${escapeHeader(from)}`, `Subject: ${escapeHeader(subject)}`, 'Content-Type: text/plain; charset="UTF-8"', "MIME-Version: 1.0", "", ensureCvLink(text, resumeUrl), ""].join("\r\n");
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

const args = parseArgs(process.argv.slice(2));
const commit = Boolean(args.commit);
const max = Number(args.max || 5);
const { missing } = validateLiveConfig({ allowMissingSourcingKeys: true });
if (missing.length) throw new Error(`Missing required live config: ${missing.join(", ")}`);
const config = getJobOutreachConfig();
if (config.mode !== "approved_send") throw new Error(`Refusing automatic send while JOB_OUTREACH_MODE is ${config.mode}; set approved_send only when approved rows should send.`);
if (!config.resumeUrl) throw new Error("Missing JOB_OUTREACH_RESUME_URL; upload the CV to Drive and configure the share link before processing outreach.");

const [leadRows, queueRows, suppressionRows] = await Promise.all([
  readRows(config.spreadsheetId, `${quoteSheetName("Leads")}!A2:W`),
  readRows(config.spreadsheetId, `${quoteSheetName("Outreach Queue")}!A2:K`),
  readRows(config.spreadsheetId, `${quoteSheetName("Suppression List")}!A2:E`),
]);
const leadsById = new Map(leadRows.map((row) => [row[0], leadFromRow(row)]));
const suppressed = new Set(suppressionRows.map((row) => rowValue(row, 0).toLowerCase()).filter(Boolean));
const results = [];
const queueUpdates = [];
const emailActivity = [];
let processed = 0;

for (const [index, row] of queueRows.entries()) {
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
  if (item.approval === "Approved" && item.sentStatus === "Sent") continue;

  if (item.approval === "Needs Rewrite") {
    if (!lead) { results.push({ queueId: item.queueId, skipped: "missing_lead_for_rewrite" }); continue; }
    const draft = buildInitialDraft({ firstName: lead.firstName, company: lead.company, title: lead.title, angle: lead.personalizationAngle || lead.hiringSignal, resumeUrl: config.resumeUrl });
    const rewrittenRow = [...row];
    rewrittenRow[4] = draft.subject;
    rewrittenRow[5] = draft.body;
    rewrittenRow[6] = "Pending";
    rewrittenRow[7] = SEND_MODE;
    rewrittenRow[9] = "Not Sent";
    rewrittenRow[10] = `Rewritten ${nowIso()}`;
    queueUpdates.push({ rowNumber, row: rewrittenRow });
    results.push({ queueId: item.queueId, action: commit ? "rewritten_to_pending" : "would_rewrite_to_pending" });
    processed += 1;
    continue;
  }

  if (!lead?.email) { results.push({ queueId: item.queueId, skipped: "missing_lead_email" }); continue; }
  if (suppressed.has(lead.email.toLowerCase())) { results.push({ queueId: item.queueId, skipped: "suppressed" }); continue; }
  if (item.sendMode !== SEND_MODE) { results.push({ queueId: item.queueId, skipped: "send_mode_not_send_on_approval" }); continue; }

  if (!commit) {
    results.push({ queueId: item.queueId, to: lead.email, dryRun: true, action: "would_send", cvLink: "present" });
    processed += 1;
    continue;
  }

  const sent = await sendMessage({ to: lead.email, from: `${config.senderName} <${config.senderEmail}>`, subject: item.subject, body: item.body, resumeUrl: config.resumeUrl });
  const messageId = sent.id || "sent";
  const sentAt = nowIso();
  const sentRow = [...row];
  sentRow[9] = "Sent";
  sentRow[10] = `sent_at=${sentAt}; gmail_message_id=${messageId}`;
  queueUpdates.push({ rowNumber, row: sentRow });
  emailActivity.push([`email_${crypto.randomUUID()}`, lead.id, lead.email, item.emailType, item.subject, sentAt, messageId, "Sent", "", `queue_id=${item.queueId}; cv_link=present`]);
  results.push({ queueId: item.queueId, to: lead.email, messageId, action: "sent", cvLink: "present" });
  processed += 1;
}

if (commit) {
  for (const update of queueUpdates) {
    await putRows(config.spreadsheetId, `${quoteSheetName("Outreach Queue")}!A${update.rowNumber}:K${update.rowNumber}`, [update.row]);
  }
  await appendRows(config.spreadsheetId, "Email Activity", emailActivity);
}

console.log(JSON.stringify({ commit, processed, results }, null, 2));
