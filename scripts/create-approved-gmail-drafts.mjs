#!/usr/bin/env node

import { getJobOutreachConfig, readOpenClawApiKey, validateLiveConfig } from "../lib/job-outreach/runtime-config.mjs";

const SHEETS_BASE = "https://gateway.maton.ai/google-sheets/v4";
const GMAIL_BASE = "https://gateway.maton.ai/google-mail/gmail/v1";

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
function encodeBase64Url(value) { return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function escapeHeader(value) { return String(value || "").replace(/\r?\n/g, " ").trim(); }
function buildMimeMessage({ to, from, subject, text }) {
  return [`To: ${escapeHeader(to)}`, `From: ${escapeHeader(from)}`, `Subject: ${escapeHeader(subject)}`, 'Content-Type: text/plain; charset="UTF-8"', "MIME-Version: 1.0", "", text, ""].join("\r\n");
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

async function createDraft({ to, from, subject, body }) {
  const raw = encodeBase64Url(buildMimeMessage({ to, from, subject, text: body }));
  return requestJson(`${GMAIL_BASE}/users/me/drafts`, { method: "POST", body: { message: { raw } } });
}

const args = parseArgs(process.argv.slice(2));
const commit = Boolean(args.commit);
const max = Number(args.max || 5);
const { missing } = validateLiveConfig({ allowMissingSourcingKeys: true });
if (missing.length) throw new Error(`Missing required live config: ${missing.join(", ")}`);
const config = getJobOutreachConfig();
if (config.mode !== "draft_only") throw new Error(`Refusing Gmail draft creation while mode is ${config.mode}; MVP must stay draft_only.`);

const [leadRows, queueRows, suppressionRows] = await Promise.all([
  readRows(config.spreadsheetId, `${quoteSheetName("Leads")}!A2:T`),
  readRows(config.spreadsheetId, `${quoteSheetName("Outreach Queue")}!A2:K`),
  readRows(config.spreadsheetId, `${quoteSheetName("Suppression List")}!A2:E`),
]);
const leadsById = new Map(leadRows.map((row) => [row[0], { id: row[0], email: row[6], status: row[18], name: row[5] }]));
const suppressed = new Set(suppressionRows.map((row) => String(row[0] || "").trim().toLowerCase()).filter(Boolean));
const approved = queueRows
  .map((row) => ({ queueId: row[0], leadId: row[1], subject: row[4], body: row[5], approval: row[6], sendMode: row[7], sentStatus: row[9] }))
  .filter((row) => row.approval === "Approved" && row.sendMode === "Draft Only" && row.sentStatus !== "Drafted")
  .slice(0, max);

const results = [];
for (const item of approved) {
  const lead = leadsById.get(item.leadId);
  if (!lead?.email) { results.push({ queueId: item.queueId, skipped: "missing_lead_email" }); continue; }
  if (suppressed.has(lead.email.toLowerCase())) { results.push({ queueId: item.queueId, skipped: "suppressed" }); continue; }
  if (!commit) { results.push({ queueId: item.queueId, to: lead.email, dryRun: true }); continue; }
  const draft = await createDraft({ to: lead.email, from: `${config.senderName} <${config.senderEmail}>`, subject: item.subject, body: item.body });
  results.push({ queueId: item.queueId, to: lead.email, draftId: draft.id || draft.message?.id || "created" });
}

console.log(JSON.stringify({ commit, approvedFound: approved.length, results }, null, 2));
