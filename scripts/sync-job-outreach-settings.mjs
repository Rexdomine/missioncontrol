#!/usr/bin/env node

import fs from "node:fs";
import { getJobOutreachConfig, readOpenClawApiKey, validateLiveConfig } from "../lib/job-outreach/runtime-config.mjs";

const SHEETS_BASE = "https://gateway.maton.ai/google-sheets/v4";
const SHEET_SCHEMA_PATH = new URL("../lib/job-outreach/sheet-schema.json", import.meta.url);
const { jobOutreachSettings } = JSON.parse(fs.readFileSync(SHEET_SCHEMA_PATH, "utf8"));

function quoteSheetName(name) {
  return `'${name.replaceAll("'", "''")}'`;
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

const { missing } = validateLiveConfig({ allowMissingApollo: true });
const config = getJobOutreachConfig();
if (!config.spreadsheetId) throw new Error("Missing JOB_OUTREACH_SPREADSHEET_ID");

const overrides = new Map([
  ["Daily Lead Source Limit", String(config.dailyLeadLimit)],
  ["Daily Email Send Limit", String(config.dailySendLimit)],
  ["Minimum Lead Score to Draft", String(config.minimumScoreToDraft)],
  ["Sending Mode", "Draft Only"],
  ["Auto Send", "Disabled"],
  ["Calendly Link", config.calendlyLink || "ADD_CALENDLY_LINK"],
  ["Sender Name", config.senderName],
  ["Sender Email", config.senderEmail || "ADD_APPROVED_SENDER_EMAIL"],
]);
const rows = jobOutreachSettings.map(([setting, value]) => [setting, overrides.get(setting) || value]);

await requestJson(`${SHEETS_BASE}/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(`${quoteSheetName("Settings")}!A2`)}?valueInputOption=RAW`, {
  method: "PUT",
  body: { values: rows },
});

console.log(JSON.stringify({ ok: true, spreadsheetId: config.spreadsheetId, missing }, null, 2));
