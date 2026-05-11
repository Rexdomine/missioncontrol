#!/usr/bin/env node

import crypto from "node:crypto";
import { readOpenClawApiKey, validateLiveConfig } from "../lib/job-outreach/runtime-config.mjs";

const SHEETS_BASE = "https://gateway.maton.ai/google-sheets/v4";
const GMAIL_BASE = "https://gateway.maton.ai/google-mail/gmail/v1";
const SELF_EMAILS = new Set(["rextechng@gmail.com"]);

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
function rowValue(row, index) { return String(row[index] || "").trim(); }
function normalize(value) { return String(value || "").trim().toLowerCase(); }
function ensureLength(row, length) { const next = [...row]; while (next.length < length) next.push(""); return next; }
function parseNumber(value) { const number = Number(value || 0); return Number.isFinite(number) ? number : 0; }
function emailFromHeader(value = "") { return /<([^>]+)>/.exec(value)?.[1]?.trim().toLowerCase() || String(value || "").trim().toLowerCase(); }
function header(message, name) { return message.payload?.headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || ""; }
function isSelf(message) { return message.labelIds?.includes("SENT") || SELF_EMAILS.has(emailFromHeader(header(message, "From"))); }
function activityRow(type, provider, entity, status, notes) { return [`activity_${crypto.randomUUID()}`, nowIso(), type, provider, entity, status, notes]; }
function uniqueId(prefix, parts) { return `${prefix}_${crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 12)}`; }

function classifyReply(text = "") {
  const value = String(text || "").toLowerCase();
  if (/\b(unsubscribe|remove me|stop emailing|do not contact|don't contact|opt[ -]?out|take me off|not interested|no thanks|not a fit)\b/.test(value)) {
    return { classification: "Not Interested", sentiment: "Negative", nextAction: "Stop follow-ups and add to suppression list", stage: "Opted Out" };
  }
  if (/\b(out of office|ooo|away from (the )?office|on leave|vacation|annual leave)\b/.test(value)) {
    return { classification: "Out of Office", sentiment: "Neutral", nextAction: "Pause follow-up and retry later", stage: "Paused" };
  }
  if (/\b(booked|scheduled|calendar invite|meeting link|see you|confirmed|interview)\b/.test(value)) {
    return { classification: "Positive", sentiment: "Positive", nextAction: "Track interview stage", stage: "Interview" };
  }
  if (/\b(interested|let'?s talk|happy to chat|available|schedule|calendly|call|meet|conversation|sounds good|send me|share more)\b/.test(value)) {
    return { classification: "Positive", sentiment: "Positive", nextAction: "Move to interview/scheduling follow-up", stage: "Scheduling" };
  }
  if (/\b(referr?ed|looping in|cc'?ing|connect you|best person|talk to)\b/.test(value)) {
    return { classification: "Referral", sentiment: "Positive", nextAction: "Follow referred contact", stage: "Referral" };
  }
  if (/\b(automatic reply|auto-reply|autoreply)\b/.test(value)) {
    return { classification: "Auto-reply", sentiment: "Neutral", nextAction: "Review before follow-up", stage: "Paused" };
  }
  return { classification: "Unclear", sentiment: "Neutral", nextAction: "Human review", stage: "Replied" };
}

async function requestJson(url, { method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${readOpenClawApiKey()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text}`);
  return data;
}
async function readRows(spreadsheetId, range) { return (await requestJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`)).values || []; }
async function putRows(spreadsheetId, range, rows) { return requestJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, { method: "PUT", body: { values: rows } }); }
async function appendRows(spreadsheetId, tab, rows) {
  if (!rows.length) return { updates: { updatedRows: 0 } };
  return requestJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${quoteSheetName(tab)}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: "POST", body: { values: rows } });
}
async function gmailThread(threadId) { return requestJson(`${GMAIL_BASE}/users/me/threads/${encodeURIComponent(threadId)}?format=metadata`); }
async function incrementDailyMetric(spreadsheetId, metricDate, columnIndex, amount) {
  const rows = await readRows(spreadsheetId, `${quoteSheetName("Daily Metrics")}!A2:M`);
  const rowIndex = rows.findIndex((row) => rowValue(row, 0) === metricDate);
  if (rowIndex === -1) {
    const metricRow = [metricDate, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "Reply monitor", "Created by reply monitor"];
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
const maxThreads = Number(args.maxThreads || 25);
const { config, missing } = validateLiveConfig({ allowMissingSourcingKeys: true });
if (missing.length) throw new Error(`Missing required live config: ${missing.join(", ")}`);

const [leadRows, emailRows, replyRows, followUpRows, suppressionRows, interviewRows] = await Promise.all([
  readRows(config.spreadsheetId, `${quoteSheetName("Leads")}!A2:W`),
  readRows(config.spreadsheetId, `${quoteSheetName("Email Activity")}!A2:J`),
  readRows(config.spreadsheetId, `${quoteSheetName("Replies")}!A2:J`),
  readRows(config.spreadsheetId, `${quoteSheetName("Follow Ups")}!A2:H`),
  readRows(config.spreadsheetId, `${quoteSheetName("Suppression List")}!A2:E`),
  readRows(config.spreadsheetId, `${quoteSheetName("Interviews")}!A2:J`),
]);

const leadsById = new Map(leadRows.map((row, index) => [rowValue(row, 0), { row, rowNumber: index + 2 }]));
const knownReplyIds = new Set(replyRows.map((row) => rowValue(row, 0)).filter(Boolean));
const suppressed = new Set(suppressionRows.map((row) => normalize(row[0])).filter(Boolean));
const interviewsByLead = new Set(interviewRows.map((row) => rowValue(row, 1)).filter(Boolean));
const sentActivities = emailRows.filter((row) => rowValue(row, 7) === "Sent" && rowValue(row, 6)).slice(0, maxThreads);

const repliesToAppend = [];
const suppressionToAppend = [];
const interviewsToAppend = [];
const activityToAppend = [];
const leadUpdates = [];
const followUpUpdates = [];
let repliesFound = 0;
let optOuts = 0;
let positives = 0;
let interviews = 0;

for (const sent of sentActivities) {
  const leadId = rowValue(sent, 1);
  const leadRecord = leadsById.get(leadId);
  const lead = leadRecord?.row;
  const threadId = rowValue(sent, 6);
  if (!lead || !threadId) continue;
  const thread = await gmailThread(threadId);
  const inboundMessages = (thread.messages || []).filter((message) => !isSelf(message));
  for (const message of inboundMessages) {
    const replyId = uniqueId("reply", [leadId, message.id]);
    if (knownReplyIds.has(replyId)) continue;
    const fromEmail = emailFromHeader(header(message, "From"));
    const replyDate = new Date(Number(message.internalDate || Date.now())).toISOString();
    const snippet = message.snippet || "";
    const classification = classifyReply([snippet, header(message, "Subject")].join(" "));
    repliesToAppend.push([replyId, leadId, fromEmail, replyDate, snippet, classification.classification, classification.sentiment, classification.nextAction, "", "No"]);
    knownReplyIds.add(replyId);
    repliesFound += 1;

    const nextLead = ensureLength(lead, 23);
    nextLead[18] = classification.stage === "Opted Out" ? "Rejected" : classification.stage === "Interview" || classification.stage === "Scheduling" ? "Interview Booked" : "Replied";
    nextLead[19] = [rowValue(nextLead, 19), `last_reply=${classification.classification}; reply_id=${replyId}`].filter(Boolean).join("; ");
    leadUpdates.push({ rowNumber: leadRecord.rowNumber, row: nextLead });

    for (const [index, followUp] of followUpRows.entries()) {
      if (rowValue(followUp, 1) !== leadId) continue;
      const status = rowValue(followUp, 4);
      if (status && !/^pending$/i.test(status)) continue;
      const nextFollowUp = ensureLength(followUp, 8);
      nextFollowUp[4] = classification.stage === "Opted Out" ? "Stopped - Opt-out" : "Paused - Reply Received";
      nextFollowUp[5] = `${classification.classification}: ${classification.nextAction}`;
      followUpUpdates.push({ rowNumber: index + 2, row: nextFollowUp });
    }

    if (classification.stage === "Opted Out") {
      optOuts += 1;
      const email = rowValue(lead, 6).toLowerCase();
      if (email && !suppressed.has(email)) {
        suppressionToAppend.push([email, rowValue(lead, 5), rowValue(lead, 9), `Reply classified as ${classification.classification}`, todayDate(replyDate)]);
        suppressed.add(email);
      }
    }
    if (["Positive", "Referral"].includes(classification.classification)) positives += 1;
    if (["Interview", "Scheduling"].includes(classification.stage) && !interviewsByLead.has(leadId)) {
      interviews += 1;
      interviewsByLead.add(leadId);
      interviewsToAppend.push([`interview_${crypto.randomUUID()}`, leadId, rowValue(lead, 9), rowValue(lead, 5), "", "", "", "", classification.stage === "Interview" ? "Booked / Needs Confirmation" : "Needs Scheduling", `reply_id=${replyId}; ${classification.nextAction}`]);
    }
    activityToAppend.push(activityRow("Reply Synced", "Gmail", fromEmail, classification.classification, `lead_id=${leadId}; reply_id=${replyId}; thread_id=${threadId}`));
  }
}

if (commit) {
  for (const update of leadUpdates) await putRows(config.spreadsheetId, `${quoteSheetName("Leads")}!A${update.rowNumber}:W${update.rowNumber}`, [update.row]);
  for (const update of followUpUpdates) await putRows(config.spreadsheetId, `${quoteSheetName("Follow Ups")}!A${update.rowNumber}:H${update.rowNumber}`, [update.row]);
  await appendRows(config.spreadsheetId, "Replies", repliesToAppend);
  await appendRows(config.spreadsheetId, "Suppression List", suppressionToAppend);
  await appendRows(config.spreadsheetId, "Interviews", interviewsToAppend);
  await appendRows(config.spreadsheetId, "Activity Log", activityToAppend);
  if (repliesFound) await incrementDailyMetric(config.spreadsheetId, todayDate(), 6, repliesFound);
  if (positives) await incrementDailyMetric(config.spreadsheetId, todayDate(), 7, positives);
  if (interviews) await incrementDailyMetric(config.spreadsheetId, todayDate(), 8, interviews);
  if (optOuts) await incrementDailyMetric(config.spreadsheetId, todayDate(), 10, optOuts);
}

console.log(JSON.stringify({ commit, scannedThreads: sentActivities.length, repliesFound, positives, interviews, optOuts, leadUpdates: leadUpdates.length, followUpUpdates: followUpUpdates.length }, null, 2));
