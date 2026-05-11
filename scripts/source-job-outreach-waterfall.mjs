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
function nowIso() { return new Date().toISOString(); }
function todayDate() { return new Date().toISOString().slice(0, 10); }
function stableId(prefix, parts) {
  return `${prefix}_${crypto.createHash("sha1").update(parts.filter(Boolean).join("|").toLowerCase()).digest("hex").slice(0, 12)}`;
}
function parseJsonEnv(value, fallback) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch (error) { throw new Error(`Invalid JSON env value: ${error.message}`); }
}
function includesAny(text, needles) {
  const lower = String(text || "").toLowerCase();
  return needles.some((needle) => lower.includes(String(needle).toLowerCase()));
}
function normalizeWebsite(urlOrDomain) {
  if (!urlOrDomain) return "";
  const value = String(urlOrDomain).trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}
function domainFromWebsite(urlOrDomain) {
  try { return new URL(normalizeWebsite(urlOrDomain)).hostname.replace(/^www\./, ""); } catch { return String(urlOrDomain || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]; }
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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text}`);
  return data;
}

function configuredCompanies(config) {
  return parseJsonEnv(process.env.JOB_OUTREACH_TARGET_COMPANIES_JSON, config.targetCompanies || []);
}

async function sourceGreenhouse(company, targetRoles, limit) {
  if (!company.greenhouseBoardToken) return [];
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(company.greenhouseBoardToken)}/jobs?content=true`);
  return (data.jobs || [])
    .filter((job) => includesAny([job.title, job.content, job.location?.name].join(" "), targetRoles))
    .slice(0, limit)
    .map((job) => ({
      provider: "Greenhouse",
      companyName: company.name || data.meta?.board_title || company.greenhouseBoardToken,
      companyWebsite: company.website || normalizeWebsite(company.domain),
      companyDomain: company.domain || domainFromWebsite(company.website),
      jobTitle: job.title || "Open role",
      jobUrl: job.absolute_url || "",
      location: job.location?.name || "",
      department: job.departments?.map((dept) => dept.name).join(", ") || "",
      raw: job,
    }));
}

async function sourceLever(company, targetRoles, limit) {
  if (!company.leverSlug) return [];
  const data = await fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(company.leverSlug)}?mode=json`);
  return (Array.isArray(data) ? data : [])
    .filter((job) => includesAny([job.text, job.descriptionPlain, job.categories?.team, job.categories?.location].join(" "), targetRoles))
    .slice(0, limit)
    .map((job) => ({
      provider: "Lever",
      companyName: company.name || company.leverSlug,
      companyWebsite: company.website || normalizeWebsite(company.domain),
      companyDomain: company.domain || domainFromWebsite(company.website),
      jobTitle: job.text || "Open role",
      jobUrl: job.hostedUrl || job.applyUrl || "",
      location: job.categories?.location || "",
      department: job.categories?.team || "",
      raw: job,
    }));
}

async function sourceHiringSignals(config, limit) {
  const targetRoles = config.targetRoles;
  const companies = configuredCompanies(config);
  const perProviderLimit = Math.max(1, Math.ceil(limit / Math.max(companies.length || 1, 1)));
  const results = [];
  const events = [];
  for (const company of companies) {
    for (const source of [sourceGreenhouse, sourceLever]) {
      try {
        const jobs = await source(company, targetRoles, perProviderLimit);
        results.push(...jobs);
        events.push([`activity_${crypto.randomUUID()}`, nowIso(), "Lead Source", jobs[0]?.provider || (source === sourceGreenhouse ? "Greenhouse" : "Lever"), company.name || company.domain || company.greenhouseBoardToken || company.leverSlug, jobs.length ? "Success" : "No matching roles", `Matched ${jobs.length} role(s)`]);
      } catch (error) {
        events.push([`activity_${crypto.randomUUID()}`, nowIso(), "Lead Source", source === sourceGreenhouse ? "Greenhouse" : "Lever", company.name || company.domain || company.greenhouseBoardToken || company.leverSlug, "Error", error.message]);
      }
    }
  }
  return { jobs: results.slice(0, limit), events };
}

async function findymailJson(config, path, body) {
  const response = await fetch(`${config.findymailApiBase.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.findymailApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`Findymail ${path} failed: ${response.status} ${response.statusText}: ${text}`);
  return data;
}

async function enrichWithFindymail(config, job) {
  if (!config.findymailApiKey || !job.companyDomain) return [];
  const employees = await findymailJson(config, "/api/search/employees", {
    website: job.companyDomain,
    job_titles: config.decisionMakerTitles.slice(0, 10),
    count: 2,
  });
  const people = Array.isArray(employees) ? employees : employees.data || employees.contacts || employees.results || [];
  const contacts = [];
  for (const person of people.slice(0, 2)) {
    const name = person.name || person.fullName || [person.first_name, person.last_name].filter(Boolean).join(" ");
    if (!name) continue;
    let email = person.email || "";
    if (!email) {
      try {
        const found = await findymailJson(config, "/api/search/name", { name, domain: job.companyDomain });
        email = found.contact?.email || found.email || "";
      } catch {
        email = "";
      }
    }
    contacts.push({
      provider: "Findymail",
      name,
      email,
      linkedinUrl: person.linkedinUrl || person.linkedin_url || "",
      title: person.jobTitle || person.title || "Decision-maker",
      company: job.companyName,
    });
  }
  return contacts;
}

async function enrichWithLeadMagic(config, job) {
  if (!config.leadMagicApiKey) return [];
  const response = await fetch(`${config.leadMagicApiBase.replace(/\/$/, "")}/contacts/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.leadMagicApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ domain: job.companyDomain, company_name: job.companyName, titles: config.decisionMakerTitles }),
  });
  if (!response.ok) throw new Error(`LeadMagic enrichment failed: ${response.status} ${response.statusText}: ${await response.text()}`);
  const data = await response.json();
  return (data.contacts || data.results || []).map((contact) => ({ provider: "LeadMagic", ...contact }));
}

async function verifyWithHunter(config, email) {
  if (!config.hunterApiKey || !email) return { provider: "Hunter", state: "skipped", score: "" };
  const data = await fetchJson(`${config.hunterApiBase.replace(/\/$/, "")}/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${encodeURIComponent(config.hunterApiKey)}`);
  return { provider: "Hunter", state: data.data?.status || "checked", score: data.data?.score ?? "" };
}

async function verifyWithDropcontact(config, contact) {
  if (!config.dropcontactApiKey || !contact.email) return { provider: "Dropcontact", state: "skipped", score: "" };
  const response = await fetch(`${config.dropcontactApiBase.replace(/\/$/, "")}/batch`, {
    method: "POST",
    headers: { "X-Access-Token": config.dropcontactApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ data: [{ email: contact.email, first_name: contact.firstName, last_name: contact.lastName, company: contact.company }] }),
  });
  if (!response.ok) throw new Error(`Dropcontact verification failed: ${response.status} ${response.statusText}: ${await response.text()}`);
  return { provider: "Dropcontact", state: "submitted", score: "" };
}

async function enrichDecisionMakers(config, job) {
  const attempts = [];
  for (const provider of [enrichWithFindymail, enrichWithLeadMagic]) {
    try {
      const contacts = await provider(config, job);
      attempts.push({ provider: provider === enrichWithFindymail ? "Findymail" : "LeadMagic", count: contacts.length, ok: true });
      if (contacts.length) return { contacts, attempts };
    } catch (error) {
      attempts.push({ provider: provider === enrichWithFindymail ? "Findymail" : "LeadMagic", count: 0, ok: false, error: error.message });
    }
  }
  return { contacts: [{ provider: "Manual Review", company: job.companyName, title: "Decision-maker needed", email: "" }], attempts };
}

function normalizeContact(contact, job) {
  const fullName = contact.full_name || contact.fullName || contact.name || [contact.first_name || contact.firstName, contact.last_name || contact.lastName].filter(Boolean).join(" ");
  const [fallbackFirst, ...fallbackLast] = fullName.split(" ");
  return {
    firstName: contact.first_name || contact.firstName || fallbackFirst || "",
    lastName: contact.last_name || contact.lastName || fallbackLast.join(" ") || "",
    fullName,
    email: contact.email || contact.email_address || "",
    linkedinUrl: contact.linkedin_url || contact.linkedinUrl || "",
    title: contact.title || contact.job_title || "Decision-maker needed",
    company: contact.company || job.companyName,
    companyWebsite: job.companyWebsite,
    companyIndustry: contact.industry || job.department || "",
    companySize: contact.company_size || "",
    location: contact.location || job.location || "",
    hiringSignal: `${job.provider} public job API shows active hiring for ${job.jobTitle}. ${job.jobUrl}`,
    currentHiringTitles: job.jobTitle,
    keywords: [job.department, job.jobTitle].filter(Boolean).join(" "),
    personalizationAngle: `${job.companyName} is actively hiring for ${job.jobTitle} via ${job.provider}.`,
    sourceProvider: `${job.provider} + ${contact.provider}`,
    sourceUrl: job.jobUrl,
    enrichmentProvider: contact.provider,
  };
}

function rowKey(row, index) { return String(row[index] || "").trim().toLowerCase(); }

const args = parseArgs(process.argv.slice(2));
const commit = Boolean(args.commit);
const limit = Number(args.limit || getJobOutreachConfig().dailyLeadLimit || 50);
const { config, missing } = validateLiveConfig({ allowMissingSourcingKeys: true });
if (missing.length) throw new Error(`Missing required live config: ${missing.join(", ")}`);
if (config.mode !== "draft_only") throw new Error(`Refusing sourcing while mode is ${config.mode}; MVP must stay draft_only.`);

const [leadRows, suppressionRows] = await Promise.all([
  readSheetRows(config.spreadsheetId, `${quoteSheetName("Leads")}!A2:Z`),
  readSheetRows(config.spreadsheetId, `${quoteSheetName("Suppression List")}!A2:E`),
]);
const knownEmails = new Set(leadRows.map((row) => rowKey(row, 6)).filter(Boolean));
const knownLinkedIns = new Set(leadRows.map((row) => rowKey(row, 7)).filter(Boolean));
const knownLeadKeys = new Set(leadRows.map((row) => [rowKey(row, 9), rowKey(row, 8)].join("|")).filter((key) => key !== "|"));
const suppressedEmails = new Set(suppressionRows.map((row) => rowKey(row, 0)).filter(Boolean));

const { jobs, events } = await sourceHiringSignals(config, limit);
const leads = [];
const queue = [];
const activity = [...events];
const metrics = { jobsChecked: jobs.length, enrichedContacts: 0, suppressed: 0, duplicates: 0, queuedDrafts: 0, manualReview: 0 };

for (const job of jobs) {
  const { contacts, attempts } = await enrichDecisionMakers(config, job);
  for (const attempt of attempts) activity.push([`activity_${crypto.randomUUID()}`, nowIso(), "Enrichment", attempt.provider, job.companyName, attempt.ok ? "Success" : "Error", attempt.ok ? `Returned ${attempt.count} contact(s)` : attempt.error]);
  metrics.enrichedContacts += contacts.filter((contact) => contact.email).length;
  if (!contacts.some((contact) => contact.email)) metrics.manualReview += 1;

  for (const contact of contacts) {
    const person = normalizeContact(contact, job);
    const emailKey = person.email.toLowerCase();
    const linkedInKey = person.linkedinUrl.toLowerCase();
    const leadKey = [person.company.toLowerCase(), person.title.toLowerCase()].join("|");
    if ((emailKey && suppressedEmails.has(emailKey))) { metrics.suppressed += 1; continue; }
    if ((emailKey && knownEmails.has(emailKey)) || (linkedInKey && knownLinkedIns.has(linkedInKey)) || knownLeadKeys.has(leadKey)) { metrics.duplicates += 1; continue; }

    let verification = { provider: "None", state: person.email ? "unverified" : "manual_required", score: "" };
    try {
      verification = await verifyWithHunter(config, person.email);
      if (verification.state === "skipped") verification = await verifyWithDropcontact(config, person);
    } catch (error) {
      verification = { provider: "Verification", state: "error", score: error.message };
    }

    const signals = inferSignals(person);
    const scored = scoreLead(signals);
    const angle = buildPersonalizationAngle(person, signals);
    const id = stableId("lead", [person.email, person.linkedinUrl, person.fullName, person.company, person.currentHiringTitles]);
    const status = !person.email ? "New" : scored.score >= config.minimumScoreToDraft ? "Qualified" : scored.score >= 40 ? "New" : "Rejected";
    const notes = [`source_url=${person.sourceUrl}`, `enrichment=${person.enrichmentProvider}`, `verification=${verification.provider}:${verification.state}:${verification.score}`].join("; ");
    leads.push([
      id,
      nowIso(),
      person.sourceProvider,
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
      person.hiringSignal,
      person.currentHiringTitles,
      angle,
      scored.score,
      status,
      scored.action,
      verification.provider,
      verification.state,
      notes,
    ]);

    activity.push([`activity_${crypto.randomUUID()}`, nowIso(), "Lead Scored", person.sourceProvider, person.company, status, `score=${scored.score}; ${notes}`]);

    if (person.email && scored.score >= config.minimumScoreToDraft && !["invalid", "undeliverable", "risky"].includes(String(verification.state).toLowerCase())) {
      const draft = buildInitialDraft({ firstName: person.firstName, company: person.company, title: person.title, angle });
      queue.push([`queue_${crypto.randomUUID()}`, id, scored.priority, "Initial", draft.subject, draft.body, "Pending", "Draft Only", "", "Not Sent", ""]);
      metrics.queuedDrafts += 1;
    }
  }
}

const metricRow = [todayDate(), jobs.length, leads.filter((row) => row[18] === "Qualified").length, queue.length, 0, 0, 0, 0, 0, metrics.suppressed, "Greenhouse + Lever waterfall", `contacts=${metrics.enrichedContacts}; duplicates=${metrics.duplicates}; manual_review=${metrics.manualReview}`];

if (commit) {
  await appendRows(config.spreadsheetId, "Leads", leads);
  await appendRows(config.spreadsheetId, "Outreach Queue", queue);
  await appendRows(config.spreadsheetId, "Activity Log", activity);
  await appendRows(config.spreadsheetId, "Daily Metrics", [metricRow]);
}

console.log(JSON.stringify({ commit, jobsChecked: jobs.length, insertedLeads: leads.length, queuedDrafts: queue.length, activityEvents: activity.length, metrics }, null, 2));
