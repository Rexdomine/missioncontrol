#!/usr/bin/env node

import fs from "node:fs";
import { getJobOutreachConfig, readOpenClawApiKey, validateLiveConfig } from "../lib/job-outreach/runtime-config.mjs";

const SHEETS_BASE = "https://gateway.maton.ai/google-sheets/v4";
const SHEET_SCHEMA_PATH = new URL("../lib/job-outreach/sheet-schema.json", import.meta.url);
const { jobOutreachSettings, jobOutreachTabs } = JSON.parse(fs.readFileSync(SHEET_SCHEMA_PATH, "utf8"));

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

async function ensureSheetSchema(spreadsheetId) {
  const spreadsheet = await requestJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`);
  const existing = new Set((spreadsheet.sheets || []).map((sheet) => sheet.properties?.title).filter(Boolean));
  const missingTabs = jobOutreachTabs.filter((tab) => !existing.has(tab.name));
  if (missingTabs.length) {
    await requestJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: { requests: missingTabs.map((tab) => ({ addSheet: { properties: { title: tab.name } } })) },
    });
  }
  for (const tab of jobOutreachTabs) {
    await requestJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${quoteSheetName(tab.name)}!A1`)}?valueInputOption=RAW`, {
      method: "PUT",
      body: { values: [Array.from(tab.columns)] },
    });
  }
  return { addedTabs: missingTabs.map((tab) => tab.name), headerTabs: jobOutreachTabs.length };
}

const { missing } = validateLiveConfig({ allowMissingSourcingKeys: true });
const config = getJobOutreachConfig();
if (!config.spreadsheetId) throw new Error("Missing JOB_OUTREACH_SPREADSHEET_ID");

const schema = await ensureSheetSchema(config.spreadsheetId);
const overrides = new Map([
  ["Daily Lead Source Limit", String(config.dailyLeadLimit)],
  ["Daily Email Send Limit", String(config.dailySendLimit)],
  ["Minimum Lead Score to Draft", String(config.minimumScoreToDraft)],
  ["Sending Mode", "Draft Only"],
  ["Auto Send", "Disabled"],
  ["Calendly Link", config.calendlyLink || "ADD_CALENDLY_LINK"],
  ["Sender Name", config.senderName],
  ["Sender Email", config.senderEmail || "ADD_APPROVED_SENDER_EMAIL"],
  ["Lead Source Waterfall", "Greenhouse public API -> Lever public API"],
  ["Primary Enrichment", config.findymailApiKey ? "Findymail" : config.leadMagicApiKey ? "LeadMagic" : "ADD_FINDYMAIL_OR_LEADMAGIC_KEY"],
  ["Fallback Verification", [config.hunterApiKey ? "Hunter" : "", config.dropcontactApiKey ? "Dropcontact" : ""].filter(Boolean).join(" + ") || "ADD_HUNTER_OR_DROPCONTACT_KEY"],
  ["Target Roles", config.targetRoles.join(", ")],
  ["Target Companies JSON", config.targetCompanies.length ? `${config.targetCompanies.length} configured` : "ADD_GREENHOUSE_AND_LEVER_COMPANY_SLUGS"],
]);
const rows = jobOutreachSettings.map(([setting, value]) => [setting, overrides.get(setting) || value]);

await requestJson(`${SHEETS_BASE}/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(`${quoteSheetName("Settings")}!A2`)}?valueInputOption=RAW`, {
  method: "PUT",
  body: { values: rows },
});

console.log(JSON.stringify({ ok: true, spreadsheetId: config.spreadsheetId, missing, schema }, null, 2));
