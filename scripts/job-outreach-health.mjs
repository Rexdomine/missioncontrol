#!/usr/bin/env node

import { readOpenClawApiKey, redact, validateLiveConfig } from "../lib/job-outreach/runtime-config.mjs";

const CTRL_BASE = "https://ctrl.maton.ai";
const SHEETS_BASE = "https://gateway.maton.ai/google-sheets/v4";

async function requestJson(url, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${readOpenClawApiKey()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text}`);
  return data;
}

async function connectionStatus(app) {
  const data = await requestJson(`${CTRL_BASE}/connections?app=${encodeURIComponent(app)}&status=ACTIVE`);
  return Array.isArray(data.connections) && data.connections.length > 0;
}

async function sheetHeaderStatus(spreadsheetId) {
  const data = await requestJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'Leads'!A1:T1")}`);
  const columns = data.values?.[0] || [];
  return { ok: columns[0] === "Lead ID" && columns.at(-1) === "Notes", columns: columns.length };
}

async function apolloStatus(config) {
  if (!config.apolloApiKey) return { ok: false, state: "missing_key" };
  const response = await fetch(`${config.apolloApiBase.replace(/\/$/, "")}/auth/health`, {
    headers: { "x-api-key": config.apolloApiKey, "Cache-Control": "no-cache" },
  });
  if (response.status === 404 || response.status === 405) {
    return { ok: true, state: "key_present_endpoint_not_checked" };
  }
  return { ok: response.ok, state: `${response.status} ${response.statusText}` };
}

const { config, missing, ready } = validateLiveConfig();
const report = {
  ready,
  missing,
  mode: config.mode,
  senderEmail: config.senderEmail || "missing",
  spreadsheetId: redact(config.spreadsheetId),
  calendlyLink: config.calendlyLink ? "present" : "missing",
  apolloApiKey: config.apolloApiKey ? "present" : "missing",
  google: {
    sheets: await connectionStatus("google-sheets"),
    gmail: await connectionStatus("google-mail"),
    calendar: await connectionStatus("google-calendar"),
    drive: await connectionStatus("google-drive"),
  },
  sheet: config.spreadsheetId ? await sheetHeaderStatus(config.spreadsheetId) : { ok: false, columns: 0 },
  apollo: await apolloStatus(config),
};

console.log(JSON.stringify(report, null, 2));

if (!report.google.sheets || !report.sheet.ok || missing.length > 0) {
  process.exitCode = 1;
}
