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
  try {
    const data = await requestJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'Leads'!A1:T1")}`);
    const columns = data.values?.[0] || [];
    return { ok: columns[0] === "Lead ID" && columns.at(-1) === "Notes", columns: columns.length };
  } catch (error) {
    return { ok: false, columns: 0, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function apolloStatus(config) {
  if (!config.apolloApiKey) return { ok: false, state: "missing_key" };

  try {
  const healthResponse = await fetch(`${config.apolloApiBase.replace(/\/$/, "")}/auth/health`, {
    headers: { "x-api-key": config.apolloApiKey, "Cache-Control": "no-cache" },
  });
  if (!healthResponse.ok) {
    return { ok: false, state: `${healthResponse.status} ${healthResponse.statusText}` };
  }

  const searchResponse = await fetch(`${config.apolloApiBase.replace(/\/$/, "")}/mixed_people/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": config.apolloApiKey,
    },
    body: JSON.stringify({
      page: 1,
      per_page: 1,
      person_titles: ["Founder", "CTO", "Head of Engineering", "Technical Recruiter"],
      organization_num_employees_ranges: ["1,10", "11,20", "21,50", "51,100", "101,200"],
    }),
  });
  const text = await searchResponse.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!searchResponse.ok) {
    return {
      ok: false,
      state: data.error_code || `${searchResponse.status} ${searchResponse.statusText}`,
      detail: data.error ? String(data.error).replace(config.apolloApiKey, "[redacted]") : "Apollo search access check failed",
    };
  }

  return { ok: true, state: "search_access_ok" };
  } catch (error) {
    return { ok: false, state: "connect_error", detail: error instanceof Error ? error.message : String(error) };
  }
}

const { config, missing } = validateLiveConfig();
const apollo = await apolloStatus(config);
const google = {
  sheets: await connectionStatus("google-sheets"),
  gmail: await connectionStatus("google-mail"),
  calendar: await connectionStatus("google-calendar"),
  drive: await connectionStatus("google-drive"),
};
const sheet = config.spreadsheetId ? await sheetHeaderStatus(config.spreadsheetId) : { ok: false, columns: 0 };
const report = {
  ready: missing.length === 0 && apollo.ok && google.sheets.ok && google.gmail.ok && google.calendar.ok && google.drive.ok && sheet.ok,
  missing,
  mode: config.mode,
  senderEmail: config.senderEmail || "missing",
  spreadsheetId: redact(config.spreadsheetId),
  calendlyLink: config.calendlyLink ? "present" : "missing",
  apolloApiKey: config.apolloApiKey ? "present" : "missing",
  google,
  sheet,
  apollo,
};

console.log(JSON.stringify(report, null, 2));

if (!report.google.sheets.ok || !report.sheet.ok || !report.apollo.ok || missing.length > 0) {
  process.exitCode = 1;
}
