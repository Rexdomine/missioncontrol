#!/usr/bin/env node

import fs from "node:fs";

const CONFIG_PATH = "/home/node/.openclaw/openclaw.json";
const GATEWAY_BASE = "https://gateway.maton.ai/google-sheets/v4";
const SHEET_SCHEMA_PATH = new URL("../lib/job-outreach/sheet-schema.json", import.meta.url);
const { jobOutreachSettings, jobOutreachTabs, JOB_OUTREACH_SPREADSHEET_NAME } = JSON.parse(fs.readFileSync(SHEET_SCHEMA_PATH, "utf8"));

function readApiKey() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const apiKey = config?.skills?.entries?.["api-gateway"]?.apiKey;
  if (!apiKey) throw new Error(`Missing Maton API key at ${CONFIG_PATH}`);
  return apiKey;
}

async function requestJson(url, { method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${readApiKey()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return data;
}

function quoteSheetName(name) {
  return `'${name.replaceAll("'", "''")}'`;
}

function validationRequest({ sheetId, startColumnIndex, endColumnIndex, values }) {
  return {
    setDataValidation: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex, endColumnIndex },
      rule: {
        condition: { type: "ONE_OF_LIST", values: values.map((userEnteredValue) => ({ userEnteredValue })) },
        inputMessage: `Choose one of: ${values.join(", ")}`,
        strict: true,
        showCustomUi: true,
      },
    },
  };
}

async function applyDataValidation(spreadsheetId) {
  const spreadsheet = await requestJson(`${GATEWAY_BASE}/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title)`);
  const sheetsByTitle = new Map((spreadsheet.sheets || []).map((sheet) => [sheet.properties?.title, sheet.properties]));
  const outreachQueue = sheetsByTitle.get("Outreach Queue");
  const followUps = sheetsByTitle.get("Follow Ups");
  const requests = [];
  if (outreachQueue?.sheetId !== undefined) {
    requests.push(
      validationRequest({ sheetId: outreachQueue.sheetId, startColumnIndex: 6, endColumnIndex: 7, values: ["Pending", "Approved", "Rejected", "Needs Rewrite"] }),
      validationRequest({ sheetId: outreachQueue.sheetId, startColumnIndex: 7, endColumnIndex: 8, values: ["Send on Approval"] }),
    );
  }
  if (followUps?.sheetId !== undefined) {
    requests.push(validationRequest({ sheetId: followUps.sheetId, startColumnIndex: 7, endColumnIndex: 8, values: ["Pending", "Approved", "Rejected", "Needs Rewrite"] }));
  }
  if (!requests.length) return;
  await requestJson(`${GATEWAY_BASE}/spreadsheets/${spreadsheetId}:batchUpdate`, { method: "POST", body: { requests } });
}

const spreadsheet = await requestJson(`${GATEWAY_BASE}/spreadsheets`, {
  method: "POST",
  body: {
    properties: { title: JOB_OUTREACH_SPREADSHEET_NAME },
    sheets: jobOutreachTabs.map((tab) => ({ properties: { title: tab.name } })),
  },
});

const spreadsheetId = spreadsheet.spreadsheetId;
if (!spreadsheetId) throw new Error(`Spreadsheet creation response did not include spreadsheetId: ${JSON.stringify(spreadsheet)}`);

for (const tab of jobOutreachTabs) {
  await requestJson(
    `${GATEWAY_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${quoteSheetName(tab.name)}!A1`)}?valueInputOption=RAW`,
    { method: "PUT", body: { values: [Array.from(tab.columns)] } },
  );
}

await requestJson(
  `${GATEWAY_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'Settings'!A2")}?valueInputOption=RAW`,
  { method: "PUT", body: { values: jobOutreachSettings.map((row) => Array.from(row)) } },
);

await applyDataValidation(spreadsheetId);

console.log(JSON.stringify({ spreadsheetId, spreadsheetUrl: spreadsheet.spreadsheetUrl, title: JOB_OUTREACH_SPREADSHEET_NAME }, null, 2));
