#!/usr/bin/env node

import crypto from "node:crypto";
import { readOpenClawApiKey, validateLiveConfig } from "../lib/job-outreach/runtime-config.mjs";

const SHEETS_BASE = "https://gateway.maton.ai/google-sheets/v4";

function quoteSheetName(name) { return `'${name.replaceAll("'", "''")}'`; }
function nowIso() { return new Date().toISOString(); }
function stableId(prefix, parts) {
  return `${prefix}_${crypto.createHash("sha1").update(parts.filter(Boolean).join("|").toLowerCase()).digest("hex").slice(0, 12)}`;
}
function rowValue(row, index) { return String(row[index] || "").trim(); }

async function sheetsJson(url, { method = "GET", body } = {}) {
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
  const data = await sheetsJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  return data.values || [];
}
async function putRows(spreadsheetId, range, rows) {
  return sheetsJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: "PUT",
    body: { values: rows },
  });
}
async function appendRows(spreadsheetId, tab, rows) {
  if (!rows.length) return { updates: { updatedRows: 0 } };
  return sheetsJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${quoteSheetName(tab)}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: { values: rows },
  });
}
async function clearRange(spreadsheetId, range) {
  return sheetsJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, { method: "POST", body: {} });
}

const { config, missing } = validateLiveConfig({ allowMissingSourcingKeys: true });
if (missing.length) throw new Error(`Missing required live config: ${missing.join(", ")}`);
if (!config.spreadsheetId) throw new Error("Missing JOB_OUTREACH_SPREADSHEET_ID");

const [leadRows, signalRows] = await Promise.all([
  readRows(config.spreadsheetId, `${quoteSheetName("Leads")}!A2:W`),
  readRows(config.spreadsheetId, `${quoteSheetName("Hiring Signals")}!A2:P`),
]);
const knownSignals = new Set(signalRows.map((row) => [rowValue(row, 3).toLowerCase(), rowValue(row, 6).toLowerCase(), rowValue(row, 7).toLowerCase()].join("|")));
const contactable = [];
const nonContactSignals = [];

for (const row of leadRows) {
  const fullName = rowValue(row, 5);
  const email = rowValue(row, 6);
  if (fullName && email) {
    contactable.push(row);
    continue;
  }
  const company = rowValue(row, 9);
  const jobTitle = rowValue(row, 15) || rowValue(row, 8);
  const sourceDetails = rowValue(row, 22);
  const sourceUrl = /source_url=([^;]+)/.exec(sourceDetails)?.[1] || "";
  const key = [company.toLowerCase(), jobTitle.toLowerCase(), sourceUrl.toLowerCase()].join("|");
  if (knownSignals.has(key)) continue;
  nonContactSignals.push([
    stableId("signal", [rowValue(row, 2), company, jobTitle, sourceUrl]),
    rowValue(row, 1) || nowIso(),
    rowValue(row, 2).split(" + ")[0] || "Imported",
    company,
    rowValue(row, 10),
    "",
    jobTitle,
    sourceUrl,
    rowValue(row, 13),
    rowValue(row, 11),
    rowValue(row, 14),
    rowValue(row, 15),
    "Needs enrichment/manual review",
    fullName ? 1 : 0,
    "",
    "Moved from Leads because it is not contact-ready: missing full name or email",
  ]);
}

await appendRows(config.spreadsheetId, "Hiring Signals", nonContactSignals);
await clearRange(config.spreadsheetId, `${quoteSheetName("Leads")}!A2:W`);
if (contactable.length) {
  await putRows(config.spreadsheetId, `${quoteSheetName("Leads")}!A2`, contactable);
}

console.log(JSON.stringify({ originalLeadRows: leadRows.length, keptContactableLeads: contactable.length, movedToHiringSignals: nonContactSignals.length }, null, 2));
