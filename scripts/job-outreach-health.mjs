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
  try {
    const data = await requestJson(`${CTRL_BASE}/connections?app=${encodeURIComponent(app)}&status=ACTIVE`);
    return { ok: Array.isArray(data.connections) && data.connections.length > 0 };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function sheetHeaderStatus(spreadsheetId) {
  const ranges = ["'Leads'!A1:W1", "'Activity Log'!A1:G1", "'Daily Metrics'!A1:L1"];
  const checks = {};
  for (const range of ranges) {
    try {
      const data = await requestJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
      const columns = data.values?.[0] || [];
      checks[range] = { ok: columns.length > 0, columns: columns.length };
    } catch (error) {
      checks[range] = { ok: false, columns: 0, detail: error instanceof Error ? error.message : String(error) };
    }
  }
  return checks;
}

async function publicApiStatus(config) {
  const companies = config.targetCompanies || [];
  if (!companies.length) return { ok: false, state: "missing_target_companies", providers: [] };
  const providers = [];
  for (const company of companies.slice(0, 3)) {
    if (company.greenhouseBoardToken) providers.push("greenhouse");
    if (company.leverSlug) providers.push("lever");
  }
  return {
    ok: providers.length > 0,
    state: providers.length ? "configured" : "missing_greenhouse_or_lever_slugs",
    providers: Array.from(new Set(providers)),
  };
}

const { config, missing } = validateLiveConfig({ allowMissingSourcingKeys: true });
const sourceKeys = {
  findymail: config.findymailApiKey ? "present" : "missing",
  leadMagic: config.leadMagicApiKey ? "present" : "missing",
  hunter: config.hunterApiKey ? "present" : "missing",
  dropcontact: config.dropcontactApiKey ? "present" : "missing",
};
const google = {
  sheets: await connectionStatus("google-sheets"),
  gmail: await connectionStatus("google-mail"),
  calendar: await connectionStatus("google-calendar"),
  drive: await connectionStatus("google-drive"),
};
const sheet = config.spreadsheetId ? await sheetHeaderStatus(config.spreadsheetId) : { ok: false, columns: 0 };
const leadSources = await publicApiStatus(config);
const primaryEnrichmentReady = Boolean(config.findymailApiKey || config.leadMagicApiKey);
const sheetReady = Object.values(sheet).every((check) => check.ok);

const report = {
  ready:
    missing.length === 0 &&
    config.mode === "draft_only" &&
    google.sheets.ok &&
    google.gmail.ok &&
    google.calendar.ok &&
    google.drive.ok &&
    sheetReady &&
    leadSources.ok &&
    primaryEnrichmentReady,
  missing,
  mode: config.mode,
  senderEmail: config.senderEmail || "missing",
  spreadsheetId: redact(config.spreadsheetId),
  calendlyLink: config.calendlyLink ? "present" : "missing",
  targetRoles: config.targetRoles,
  targetCompanies: config.targetCompanies.length,
  leadSources,
  enrichment: sourceKeys,
  google,
  sheet,
};

console.log(JSON.stringify(report, null, 2));

if (!report.ready) {
  process.exitCode = 1;
}
