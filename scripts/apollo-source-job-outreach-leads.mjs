#!/usr/bin/env node

import crypto from "node:crypto";
import { getJobOutreachConfig, readOpenClawApiKey, validateLiveConfig } from "../lib/job-outreach/runtime-config.mjs";
import { buildPersonalizationAngle, inferSignals, scoreLead } from "../lib/job-outreach/scoring.mjs";
import { buildInitialDraft } from "../lib/job-outreach/templates.mjs";

const SHEETS_BASE = "https://gateway.maton.ai/google-sheets/v4";

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
function todayIso() { return new Date().toISOString(); }
function leadId(email, linkedinUrl, fullName, company) {
  return `lead_${crypto.createHash("sha1").update([email, linkedinUrl, fullName, company].filter(Boolean).join("|").toLowerCase()).digest("hex").slice(0, 12)}`;
}

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

async function readSheetRows(spreadsheetId, range) {
  const data = await sheetsJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  return data.values || [];
}

async function appendRows(spreadsheetId, tab, rows) {
  if (!rows.length) return { updates: { updatedRows: 0 } };
  return sheetsJson(`${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${quoteSheetName(tab)}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: { values: rows },
  });
}

function normalizeApolloPerson(person) {
  const organization = person.organization || person.account || {};
  const firstName = person.first_name || person.firstName || "";
  const lastName = person.last_name || person.lastName || "";
  const fullName = person.name || [firstName, lastName].filter(Boolean).join(" ");
  return {
    raw: person,
    firstName,
    lastName,
    fullName,
    email: person.email || person.email_address || "",
    linkedinUrl: person.linkedin_url || person.linkedinUrl || "",
    title: person.title || person.job_title || "",
    company: organization.name || person.organization_name || person.company || "",
    companyWebsite: organization.website_url || organization.primary_domain || "",
    companyIndustry: organization.industry || "",
    companySize: organization.estimated_num_employees || "",
    location: [person.city, person.state, person.country].filter(Boolean).join(", "),
    organization,
  };
}

function buildApolloSearchBody(limit) {
  return {
    page: 1,
    per_page: Math.min(limit, 100),
    person_titles: [
      "Founder",
      "Co-Founder",
      "CEO",
      "CTO",
      "Head of Engineering",
      "VP Engineering",
      "Engineering Manager",
      "Head of Product",
      "Technical Recruiter",
      "Talent Partner",
      "AI Product Lead",
      "Managing Partner",
    ],
    q_organization_keyword_tags: ["AI", "SaaS", "automation", "developer tools", "fintech", "healthtech", "product studio"],
    organization_num_employees_ranges: ["1,10", "11,20", "21,50", "51,100", "101,200"],
  };
}

async function searchApollo(config, limit) {
  const url = `${config.apolloApiBase.replace(/\/$/, "")}/mixed_people/search`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": config.apolloApiKey,
    },
    body: JSON.stringify(buildApolloSearchBody(limit)),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`Apollo search failed: ${response.status} ${response.statusText}: ${text}`);
  return data.people || data.contacts || data.mixed_people || [];
}

function rowKey(row, index) {
  return String(row[index] || "").trim().toLowerCase();
}

const args = parseArgs(process.argv.slice(2));
const commit = Boolean(args.commit);
const limit = Number(args.limit || getJobOutreachConfig().dailyLeadLimit || 50);
const { config, missing } = validateLiveConfig();
if (missing.length) throw new Error(`Missing required live config: ${missing.join(", ")}`);
if (config.mode !== "draft_only") throw new Error(`Refusing Apollo sourcing while mode is ${config.mode}; MVP must stay draft_only.`);

const [leadRows, suppressionRows] = await Promise.all([
  readSheetRows(config.spreadsheetId, `${quoteSheetName("Leads")}!A2:T`),
  readSheetRows(config.spreadsheetId, `${quoteSheetName("Suppression List")}!A2:E`),
]);
const knownEmails = new Set(leadRows.map((row) => rowKey(row, 6)).filter(Boolean));
const knownLinkedIns = new Set(leadRows.map((row) => rowKey(row, 7)).filter(Boolean));
const suppressedEmails = new Set(suppressionRows.map((row) => rowKey(row, 0)).filter(Boolean));

const people = (await searchApollo(config, limit)).map(normalizeApolloPerson);
const leads = [];
const queue = [];
const rejected = [];

for (const person of people) {
  const emailKey = person.email.toLowerCase();
  const linkedInKey = person.linkedinUrl.toLowerCase();
  if ((emailKey && suppressedEmails.has(emailKey)) || (emailKey && knownEmails.has(emailKey)) || (linkedInKey && knownLinkedIns.has(linkedInKey))) continue;
  const signals = inferSignals(person);
  const scored = scoreLead(signals);
  const angle = buildPersonalizationAngle(person, signals);
  const id = leadId(person.email, person.linkedinUrl, person.fullName, person.company);
  const status = scored.score >= config.minimumScoreToDraft ? "Qualified" : scored.score >= 40 ? "New" : "Rejected";
  const leadRow = [
    id,
    todayIso(),
    "Apollo",
    person.firstName,
    person.lastName,
    person.fullName,
    person.email,
    person.linkedinUrl,
    person.title,
    person.company,
    person.companyWebsite,
    person.companyIndustry,
    person.companySize,
    person.location,
    signals.hiringEngineers ? "Hiring/engineering signal inferred from Apollo profile" : "Unverified",
    signals.skillMatch ? "AI/Python/React/FastAPI/automation fit inferred" : "Needs review",
    angle,
    scored.score,
    status,
    scored.action,
  ];
  leads.push(leadRow);
  if (scored.score >= config.minimumScoreToDraft) {
    const draft = buildInitialDraft({ firstName: person.firstName, company: person.company, title: person.title, angle });
    queue.push([
      `queue_${crypto.randomUUID()}`,
      id,
      scored.priority,
      "Initial",
      draft.subject,
      draft.body,
      "Pending",
      "Draft Only",
      "",
      "Not Sent",
      "",
    ]);
  } else if (status === "Rejected") rejected.push(id);
}

if (commit) {
  await appendRows(config.spreadsheetId, "Leads", leads);
  await appendRows(config.spreadsheetId, "Outreach Queue", queue);
}

console.log(JSON.stringify({ commit, sourcedFromApollo: people.length, insertedLeads: leads.length, queuedDrafts: queue.length, rejected: rejected.length }, null, 2));
