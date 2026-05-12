#!/usr/bin/env node

import assert from "node:assert/strict";
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
function stripHtml(value = "") {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
function includesAny(text, needles) {
  const lower = String(text || "").toLowerCase();
  return needles.some((needle) => lower.includes(String(needle).toLowerCase()));
}
function publicEmailFromText(text = "") {
  const blocked = /^(noreply|no-reply|donotreply|do-not-reply|support|privacy|legal|abuse|security)@/i;
  return String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)?.find((email) => !blocked.test(email)) || "";
}
function firstUrlFromText(text = "") {
  return String(text || "").match(/https?:\/\/[^\s<>)"]+/i)?.[0]?.replace(/[.,;]+$/, "") || "";
}
function opportunityScore(job, targetRoles) {
  const haystack = [job.jobTitle, job.description, job.department, job.location, job.applyUrl, job.publicContactEmail].join(" ").toLowerCase();
  let score = 20;
  if (includesAny(haystack, targetRoles)) score += 30;
  if (/ai|machine learning|llm|agent|automation/i.test(haystack)) score += 15;
  if (/python|fastapi|django|flask/i.test(haystack)) score += 12;
  if (/react|next\.js|typescript|frontend/i.test(haystack)) score += 12;
  if (/full.?stack|product engineer|founding engineer/i.test(haystack)) score += 12;
  if (/remote|worldwide|anywhere/i.test(haystack)) score += 8;
  if (job.applyUrl || job.jobUrl) score += 6;
  if (job.publicContactEmail) score += 10;
  return Math.min(100, score);
}
function sourceJobKey(job) {
  return [job.provider, job.companyName, job.jobTitle, job.jobUrl || job.applyUrl].map((part) => String(part || "").toLowerCase()).join("|");
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
function domainFromEmail(email) {
  const domain = String(email || "").split("@")[1] || "";
  return domain.replace(/^www\./, "").toLowerCase();
}
function isLikelyCompanyDomain(domain) {
  if (!domain || !domain.includes(".")) return false;
  return !/(^|\.)(himalayas\.app|remotive\.com|jobicy\.com|arbeitnow\.com|ycombinator\.com|news\.ycombinator\.com|greenhouse\.io|boards\.greenhouse\.io|lever\.co|api\.lever\.co|linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|github\.com|google\.com|gmail\.com|outlook\.com|hotmail\.com|yahoo\.com|remotivecdn\.com|cloudfront\.net)$/i.test(domain);
}
function firstCompanyUrlFromText(text = "") {
  const urls = String(text || "").match(/https?:\/\/[^\s<>)"]+/gi) || [];
  return urls.map((url) => url.replace(/[.,;]+$/, "")).find((url) => isLikelyCompanyDomain(domainFromWebsite(url))) || "";
}
function inferCompanyDomain(job) {
  const candidates = [
    job.companyDomain,
    domainFromWebsite(job.companyWebsite || ""),
    domainFromEmail(job.publicContactEmail || ""),
    domainFromWebsite(firstCompanyUrlFromText([job.description, job.raw?.description, job.raw?.text].join(" "))),
  ];
  return candidates.find(isLikelyCompanyDomain) || "";
}
function inferCompanyWebsite(job) {
  const domain = inferCompanyDomain(job);
  if (job.companyWebsite && isLikelyCompanyDomain(domainFromWebsite(job.companyWebsite))) return normalizeWebsite(job.companyWebsite);
  return domain ? normalizeWebsite(domain) : (job.companyWebsite || "");
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
  const response = await fetch(url, { ...options, headers: { "User-Agent": "MissionControlJobOutreach/1.0", ...(options.headers || {}) } });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text}`);
  return data;
}

function configuredCompanies(config) {
  return parseJsonEnv(process.env.JOB_OUTREACH_TARGET_COMPANIES_JSON, config.targetCompanies || []);
}

function normalizeJob(job, targetRoles) {
  const publicContactEmail = job.publicContactEmail || publicEmailFromText([job.description, job.raw?.text, job.raw?.description].join(" "));
  const enrichedJob = { ...job, publicContactEmail };
  const companyDomain = inferCompanyDomain(enrichedJob);
  const companyWebsite = inferCompanyWebsite({ ...enrichedJob, companyDomain });
  const score = opportunityScore({ ...enrichedJob, companyDomain, companyWebsite }, targetRoles);
  return {
    ...job,
    companyWebsite,
    companyDomain,
    applyUrl: job.applyUrl || job.jobUrl || "",
    publicContactEmail,
    opportunityScore: score,
  };
}

async function sourceGreenhouse(company, targetRoles, limit) {
  if (!company.greenhouseBoardToken) return [];
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(company.greenhouseBoardToken)}/jobs?content=true`);
  return (data.jobs || [])
    .filter((job) => includesAny([job.title, job.content, job.location?.name].join(" "), targetRoles))
    .slice(0, limit)
    .map((job) => normalizeJob({
      provider: "Greenhouse",
      companyName: company.name || data.meta?.board_title || company.greenhouseBoardToken,
      companyWebsite: company.website || normalizeWebsite(company.domain),
      companyDomain: company.domain || domainFromWebsite(company.website),
      jobTitle: job.title || "Open role",
      jobUrl: job.absolute_url || "",
      applyUrl: job.absolute_url || "",
      publicContactEmail: publicEmailFromText(job.content),
      location: job.location?.name || "",
      department: job.departments?.map((dept) => dept.name).join(", ") || "",
      description: stripHtml(job.content || ""),
      raw: job,
    }, targetRoles));
}

async function sourceLever(company, targetRoles, limit) {
  if (!company.leverSlug) return [];
  const data = await fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(company.leverSlug)}?mode=json`);
  return (Array.isArray(data) ? data : [])
    .filter((job) => includesAny([job.text, job.descriptionPlain, job.categories?.team, job.categories?.location].join(" "), targetRoles))
    .slice(0, limit)
    .map((job) => normalizeJob({
      provider: "Lever",
      companyName: company.name || company.leverSlug,
      companyWebsite: company.website || normalizeWebsite(company.domain),
      companyDomain: company.domain || domainFromWebsite(company.website),
      jobTitle: job.text || "Open role",
      jobUrl: job.hostedUrl || job.applyUrl || "",
      applyUrl: job.applyUrl || job.hostedUrl || "",
      publicContactEmail: publicEmailFromText(job.descriptionPlain || job.description || ""),
      location: job.categories?.location || "",
      department: job.categories?.team || "",
      description: stripHtml(job.descriptionPlain || job.description || ""),
      raw: job,
    }, targetRoles));
}

async function sourceHimalayas(_config, targetRoles, limit) {
  const data = await fetchJson(`https://himalayas.app/jobs/api?limit=${Math.min(100, Math.max(20, limit * 4))}`);
  return (data.jobs || [])
    .filter((job) => includesAny([job.title, job.excerpt, job.companyName, job.categories?.join(" "), job.description].join(" "), targetRoles))
    .slice(0, limit)
    .map((job) => normalizeJob({
      provider: "Himalayas",
      companyName: job.companyName || "Unknown company",
      companyWebsite: job.companyWebsite ? normalizeWebsite(job.companyWebsite) : (job.companySlug ? `https://himalayas.app/companies/${job.companySlug}` : ""),
      companyDomain: domainFromWebsite(job.companyWebsite || ""),
      jobTitle: job.title || "Open role",
      jobUrl: job.applicationLink || job.url || `https://himalayas.app/jobs/${job.slug || ""}`,
      applyUrl: job.applicationLink || job.url || `https://himalayas.app/jobs/${job.slug || ""}`,
      publicContactEmail: publicEmailFromText([job.description, job.excerpt].join(" ")),
      location: Array.isArray(job.locationRestrictions) ? job.locationRestrictions.join(", ") : job.location || "Remote",
      department: Array.isArray(job.categories) ? job.categories.join(", ") : "",
      description: stripHtml([job.excerpt, job.description].join(" ")),
      raw: job,
    }, targetRoles));
}

async function sourceRemotive(_config, targetRoles, limit) {
  const data = await fetchJson(`https://remotive.com/api/remote-jobs?category=software-dev&limit=${Math.min(100, Math.max(20, limit * 4))}`);
  return (data.jobs || [])
    .filter((job) => includesAny([job.title, job.description, job.company_name, job.candidate_required_location].join(" "), targetRoles))
    .slice(0, limit)
    .map((job) => normalizeJob({
      provider: "Remotive",
      companyName: job.company_name || "Unknown company",
      companyWebsite: normalizeWebsite(job.company_url || ""),
      companyDomain: domainFromWebsite(job.company_url || ""),
      jobTitle: job.title || "Open role",
      jobUrl: job.url || "",
      applyUrl: job.url || "",
      publicContactEmail: publicEmailFromText(job.description),
      location: job.candidate_required_location || "Remote",
      department: job.category || "Software Development",
      description: stripHtml(job.description || ""),
      raw: job,
    }, targetRoles));
}

async function sourceJobicy(_config, targetRoles, limit) {
  const tags = ["python", "react", "full-stack", "javascript", "software-dev"];
  const jobs = [];
  for (const tag of tags) {
    const data = await fetchJson(`https://jobicy.com/api/v2/remote-jobs?count=${Math.min(50, Math.max(10, limit))}&tag=${encodeURIComponent(tag)}`);
    jobs.push(...(data.jobs || []));
  }
  return jobs
    .filter((job) => includesAny([job.jobTitle, job.jobDescription, job.companyName, job.jobIndustry, job.jobGeo].join(" "), targetRoles))
    .slice(0, limit)
    .map((job) => normalizeJob({
      provider: "Jobicy",
      companyName: job.companyName || "Unknown company",
      companyWebsite: normalizeWebsite(job.companyWebsite || ""),
      companyDomain: domainFromWebsite(job.companyWebsite || ""),
      jobTitle: job.jobTitle || "Open role",
      jobUrl: job.url || "",
      applyUrl: job.url || "",
      publicContactEmail: publicEmailFromText(job.jobDescription),
      location: job.jobGeo || "Remote",
      department: Array.isArray(job.jobIndustry) ? job.jobIndustry.join(", ") : job.jobIndustry || "",
      description: stripHtml(job.jobDescription || ""),
      raw: job,
    }, targetRoles));
}

async function sourceArbeitnow(_config, targetRoles, limit) {
  const data = await fetchJson(`https://www.arbeitnow.com/api/job-board-api?per_page=${Math.min(100, Math.max(20, limit * 4))}`);
  return (data.data || [])
    .filter((job) => includesAny([job.title, job.description, job.company_name, (job.tags || []).join(" ")].join(" "), targetRoles))
    .slice(0, limit)
    .map((job) => normalizeJob({
      provider: "Arbeitnow",
      companyName: job.company_name || "Unknown company",
      companyWebsite: "",
      companyDomain: "",
      jobTitle: job.title || "Open role",
      jobUrl: job.url || "",
      applyUrl: job.url || "",
      publicContactEmail: publicEmailFromText(job.description),
      location: job.location || (job.remote ? "Remote" : ""),
      department: Array.isArray(job.tags) ? job.tags.join(", ") : "",
      description: stripHtml(job.description || ""),
      raw: job,
    }, targetRoles));
}

function hnThreadMonthQuery() {
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return `Ask HN: Who is hiring? (${month} ${now.getUTCFullYear()})`;
}
function hnCompanyFromComment(text) { return stripHtml(text).split("|")[0]?.trim().slice(0, 80) || "HN Company"; }
function hnTitleFromComment(text, targetRoles) {
  const cleaned = stripHtml(text);
  const hiringMatch = /\bHiring:\s*([^.!?]{3,120})/i.exec(cleaned);
  if (hiringMatch) return hiringMatch[1].replace(/^[-:\s]+/, "").trim();
  const parts = cleaned.split("|").map((part) => part.trim()).filter(Boolean);
  const rolePart = parts.find((part) => includesAny(part, targetRoles) && part.length <= 120);
  if (rolePart) return rolePart;
  return parts.find((part) => /engineer|developer|python|react|ai/i.test(part) && part.length <= 120) || parts[1]?.slice(0, 120) || "Open engineering role";
}
async function sourceHnWhoIsHiring(_config, targetRoles, limit) {
  const search = await fetchJson(`https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(hnThreadMonthQuery())}&tags=story&hitsPerPage=5`);
  const thread = (search.hits || []).find((hit) => /who.?s hiring|who is hiring/i.test(hit.title || ""));
  if (!thread?.objectID) return [];
  const story = await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${thread.objectID}.json`);
  const comments = [];
  for (const id of (story.kids || []).slice(0, Math.min(120, limit * 8))) {
    try {
      const comment = await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      const text = stripHtml(comment.text || "");
      if (includesAny(text, targetRoles)) comments.push({ id, text, raw: comment });
      if (comments.length >= limit) break;
    } catch { /* ignore deleted comments */ }
  }
  return comments.map((comment) => normalizeJob({
    provider: "HN Who's Hiring",
    companyName: hnCompanyFromComment(comment.text),
    companyWebsite: firstUrlFromText(comment.text),
    companyDomain: domainFromWebsite(firstUrlFromText(comment.text)),
    jobTitle: hnTitleFromComment(comment.text, targetRoles),
    jobUrl: `https://news.ycombinator.com/item?id=${comment.id}`,
    applyUrl: firstUrlFromText(comment.text) || `https://news.ycombinator.com/item?id=${comment.id}`,
    publicContactEmail: publicEmailFromText(comment.text),
    location: /remote/i.test(comment.text) ? "Remote / HN listed" : "HN listed",
    department: "HN Who's Hiring",
    description: comment.text,
    raw: comment.raw,
  }, targetRoles));
}

async function sourceHiringSignals(config, limit) {
  const targetRoles = config.targetRoles;
  const companies = configuredCompanies(config);
  const providerLimit = Math.max(3, Math.ceil(limit / 4));
  const results = [];
  const events = [];
  const publicSources = [sourceHimalayas, sourceRemotive, sourceJobicy, sourceArbeitnow, sourceHnWhoIsHiring];
  for (const source of publicSources) {
    const providerName = source.name.replace(/^source/, "") || "Public API";
    try {
      const jobs = await source(config, targetRoles, providerLimit);
      results.push(...jobs);
      events.push([`activity_${crypto.randomUUID()}`, nowIso(), "Lead Source", providerName, "Free-first public jobs", jobs.length ? "Success" : "No matching roles", `Matched ${jobs.length} role(s)`]);
    } catch (error) {
      events.push([`activity_${crypto.randomUUID()}`, nowIso(), "Lead Source", providerName, "Free-first public jobs", "Error", error.message]);
    }
  }
  const perCompanyLimit = Math.max(1, Math.ceil(limit / Math.max(companies.length || 1, 1)));
  for (const company of companies) {
    for (const source of [sourceGreenhouse, sourceLever]) {
      try {
        const jobs = await source(company, targetRoles, perCompanyLimit);
        results.push(...jobs);
        events.push([`activity_${crypto.randomUUID()}`, nowIso(), "Lead Source", jobs[0]?.provider || (source === sourceGreenhouse ? "Greenhouse" : "Lever"), company.name || company.domain || company.greenhouseBoardToken || company.leverSlug, jobs.length ? "Success" : "No matching roles", `Matched ${jobs.length} role(s)`]);
      } catch (error) {
        events.push([`activity_${crypto.randomUUID()}`, nowIso(), "Lead Source", source === sourceGreenhouse ? "Greenhouse" : "Lever", company.name || company.domain || company.greenhouseBoardToken || company.leverSlug, "Error", error.message]);
      }
    }
  }
  const deduped = [];
  const seen = new Set();
  for (const job of results.sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0))) {
    const key = sourceJobKey(job);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(job);
    if (deduped.length >= limit) break;
  }
  return { jobs: deduped, events };
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

async function leadMagicJson(config, path, body) {
  const response = await fetch(`${config.leadMagicApiBase.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { "X-API-Key": config.leadMagicApiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`LeadMagic ${path} failed: ${response.status} ${response.statusText}: ${text}`);
  return data;
}

async function enrichWithLeadMagic(config, job) {
  if (!config.leadMagicApiKey || !job.companyDomain) return [];
  for (const title of config.decisionMakerTitles.slice(0, 8)) {
    const person = await leadMagicJson(config, "/v1/people/role-finder", {
      job_title: title,
      company_domain: job.companyDomain,
      company_name: job.companyName,
    });
    const fullName = person.full_name || person.name || [person.first_name, person.last_name].filter(Boolean).join(" ");
    if (!fullName || /no matching role/i.test(person.message || "")) continue;
    let email = person.email || "";
    if (!email) {
      const found = await leadMagicJson(config, "/v1/people/email-finder", {
        full_name: fullName,
        first_name: person.first_name,
        last_name: person.last_name,
        domain: job.companyDomain,
        company_name: job.companyName,
      });
      email = found.email || "";
    }
    return [{
      provider: "LeadMagic",
      fullName,
      firstName: person.first_name || "",
      lastName: person.last_name || "",
      email,
      linkedinUrl: person.profile_url || "",
      title: person.job_title || title,
      company: person.company_name || job.companyName,
      company_size: person.company_size || "",
      industry: person.company_industry || "",
    }];
  }
  return [];
}

async function enrichWithHunterDomainSearch(config, job) {
  if (!config.hunterApiKey || !job.companyDomain) return [];
  const url = new URL(`${config.hunterApiBase.replace(/\/$/, "")}/v2/domain-search`);
  url.searchParams.set("domain", job.companyDomain);
  url.searchParams.set("limit", "10");
  url.searchParams.set("api_key", config.hunterApiKey);
  const data = await fetchJson(url.toString());
  const emails = data.data?.emails || [];
  const titleNeedles = config.decisionMakerTitles.map((title) => title.toLowerCase());
  const ranked = emails
    .filter((contact) => contact.value && !/^(noreply|no-reply|donotreply|do-not-reply|support|privacy|legal|abuse|security)@/i.test(contact.value))
    .map((contact) => ({
      contact,
      rank: titleNeedles.some((title) => String(contact.position || "").toLowerCase().includes(title)) ? 0 : 1,
    }))
    .sort((a, b) => a.rank - b.rank || Number(b.contact.confidence || 0) - Number(a.contact.confidence || 0));
  return ranked.slice(0, 2).map(({ contact }) => ({
    provider: "Hunter Domain Search",
    fullName: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.value.split("@")[0].replace(/[._-]+/g, " "),
    firstName: contact.first_name || "",
    lastName: contact.last_name || "",
    email: contact.value || "",
    linkedinUrl: contact.linkedin || "",
    title: contact.position || "Decision-maker",
    company: job.companyName,
  }));
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
  if (job.publicContactEmail) {
    attempts.push({ provider: "Public Contact", count: 1, ok: true });
    return {
      contacts: [{
        provider: "Public Contact",
        fullName: "Hiring Team",
        firstName: "Hiring",
        lastName: "Team",
        email: job.publicContactEmail,
        linkedinUrl: "",
        title: "Hiring Team",
        company: job.companyName,
      }],
      attempts,
    };
  }
  const enrichers = [
    { name: "Findymail", run: enrichWithFindymail },
    { name: "LeadMagic", run: enrichWithLeadMagic },
    { name: "Hunter Domain Search", run: enrichWithHunterDomainSearch },
  ];
  for (const provider of enrichers) {
    try {
      const contacts = await provider.run(config, job);
      attempts.push({ provider: provider.name, count: contacts.length, ok: true });
      if (contacts.length) return { contacts, attempts };
    } catch (error) {
      attempts.push({ provider: provider.name, count: 0, ok: false, error: error.message });
    }
  }
  return { contacts: [{ provider: "Manual Review", company: job.companyName, title: "Decision-maker needed", email: "" }], attempts };
}

function isContactableContact(contact) {
  if (!contact.email) return false;
  return Boolean(contact.name || contact.fullName || contact.full_name || contact.firstName || contact.first_name || contact.provider === "Public Contact");
}

function normalizeContact(contact, job) {
  const emailLocalPart = String(contact.email || "").split("@")[0]?.replace(/[._-]+/g, " ").trim();
  const fullName = contact.full_name || contact.fullName || contact.name || [contact.first_name || contact.firstName, contact.last_name || contact.lastName].filter(Boolean).join(" ") || (contact.provider === "Public Contact" ? "Hiring Team" : emailLocalPart);
  const [fallbackFirst, ...fallbackLast] = fullName.split(" ");
  return {
    firstName: contact.first_name || contact.firstName || fallbackFirst || (contact.provider === "Public Contact" ? "Hiring" : ""),
    lastName: contact.last_name || contact.lastName || fallbackLast.join(" ") || (contact.provider === "Public Contact" ? "Team" : ""),
    fullName,
    email: contact.email || contact.email_address || "",
    linkedinUrl: contact.linkedin_url || contact.linkedinUrl || "",
    title: contact.title || contact.job_title || "Decision-maker needed",
    company: contact.company || job.companyName,
    companyWebsite: job.companyWebsite,
    companyIndustry: contact.industry || job.department || "",
    companySize: contact.company_size || "",
    location: contact.location || job.location || "",
    hiringSignal: `${job.provider} shows active hiring for ${job.jobTitle}. ${job.applyUrl || job.jobUrl}`,
    currentHiringTitles: job.jobTitle,
    keywords: [job.department, job.jobTitle, job.description].filter(Boolean).join(" "),
    personalizationAngle: `${job.companyName} is hiring for ${job.jobTitle} via ${job.provider}.`,
    sourceProvider: `${job.provider} + ${contact.provider}`,
    sourceUrl: job.applyUrl || job.jobUrl,
    enrichmentProvider: contact.provider,
  };
}

async function runSelfTest() {
  const remotiveJob = normalizeJob({
    provider: "Remotive",
    companyName: "ExampleCo",
    companyWebsite: normalizeWebsite("example.com"),
    companyDomain: domainFromWebsite("example.com"),
    company_logo: "https://remotivecdn.com/logo.png",
    jobTitle: "Senior Full Stack Engineer",
    jobUrl: "https://remotive.com/remote-jobs/software-dev/senior-full-stack-engineer",
    applyUrl: "https://remotive.com/remote-jobs/software-dev/senior-full-stack-engineer",
    publicContactEmail: "",
    location: "Remote",
    department: "Software Development",
    description: "Build AI systems. Email careers@example.com or visit https://example.com/careers.",
    raw: {},
  }, ["Full Stack Engineer"]);
  assert.equal(remotiveJob.companyDomain, "example.com");
  assert.equal(remotiveJob.companyWebsite, "https://example.com");
  assert.equal(remotiveJob.publicContactEmail, "careers@example.com");

  const { contacts } = await enrichDecisionMakers({ hunterApiKey: "" }, remotiveJob);
  assert.equal(contacts[0].provider, "Public Contact");
  assert.equal(isContactableContact(contacts[0]), true);
  const normalized = normalizeContact(contacts[0], remotiveJob);
  assert.equal(normalized.fullName, "Hiring Team");
  assert.equal(normalized.firstName, "Hiring");
  assert.equal(normalized.email, "careers@example.com");

  const fetchedUrls = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    fetchedUrls.push(String(url));
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ data: { emails: [{ value: "cto@example.com", first_name: "Ada", last_name: "Lovelace", position: "CTO", confidence: 96 }] } }),
    };
  };
  try {
    const hunterContacts = await enrichWithHunterDomainSearch({ hunterApiKey: "hunter-key", hunterApiBase: "https://api.hunter.io", decisionMakerTitles: ["CTO"] }, { ...remotiveJob, publicContactEmail: "" });
    assert.equal(hunterContacts[0].provider, "Hunter Domain Search");
    assert.equal(hunterContacts[0].email, "cto@example.com");
    assert.match(fetchedUrls[0], /domain=example\.com/);
  } finally {
    globalThis.fetch = previousFetch;
  }

  console.log("source-job-outreach-waterfall self-test passed");
}

function rowKey(row, index) { return String(row[index] || "").trim().toLowerCase(); }

const args = parseArgs(process.argv.slice(2));
if (args["self-test"]) {
  await runSelfTest();
  process.exit(0);
}
const commit = Boolean(args.commit);
const runtimeConfig = getJobOutreachConfig();
const limit = Number(args.limit || runtimeConfig.dailyLeadLimit || 50);
const minContactable = args["min-contactable"] === undefined ? 0 : Number(args["min-contactable"] || 0);
const { config, missing } = validateLiveConfig({ allowMissingSourcingKeys: true });
if (missing.length) throw new Error(`Missing required live config: ${missing.join(", ")}`);
if (!["draft_only", "approved_send"].includes(config.mode)) throw new Error(`Refusing sourcing while mode is ${config.mode}; expected draft_only or approved_send.`);

const [leadRows, signalRows, suppressionRows] = await Promise.all([
  readSheetRows(config.spreadsheetId, `${quoteSheetName("Leads")}!A2:Z`),
  readSheetRows(config.spreadsheetId, `${quoteSheetName("Hiring Signals")}!A2:P`),
  readSheetRows(config.spreadsheetId, `${quoteSheetName("Suppression List")}!A2:E`),
]);
const knownEmails = new Set(leadRows.map((row) => rowKey(row, 6)).filter(Boolean));
const knownLinkedIns = new Set(leadRows.map((row) => rowKey(row, 7)).filter(Boolean));
const knownSignalKeys = new Set(signalRows.map((row) => [rowKey(row, 3), rowKey(row, 6), rowKey(row, 7)].join("|")).filter((key) => key !== "||"));
const suppressedEmails = new Set(suppressionRows.map((row) => rowKey(row, 0)).filter(Boolean));

const { jobs, events } = await sourceHiringSignals(config, limit);
const hiringSignals = [];
const leads = [];
const queue = [];
const activity = [...events];
const metrics = { jobsChecked: jobs.length, hiringSignals: 0, contactableLeads: 0, enrichedContacts: 0, suppressed: 0, duplicates: 0, queuedDrafts: 0, manualReview: 0 };

for (const job of jobs) {
  const { contacts, attempts } = await enrichDecisionMakers(config, job);
  for (const attempt of attempts) activity.push([`activity_${crypto.randomUUID()}`, nowIso(), "Enrichment", attempt.provider, job.companyName, attempt.ok ? "Success" : "Error", attempt.ok ? `Returned ${attempt.count} contact(s)` : attempt.error]);
  const contactableContacts = contacts.filter(isContactableContact);
  metrics.enrichedContacts += contactableContacts.length;
  if (!contactableContacts.length) metrics.manualReview += 1;
  const signalId = stableId("signal", [job.provider, job.companyName, job.jobTitle, job.jobUrl]);
  const signalKey = [String(job.companyName || "").toLowerCase(), String(job.jobTitle || "").toLowerCase(), String(job.jobUrl || "").toLowerCase()].join("|");
  const leadIdsForSignal = [];

  for (const contact of contactableContacts) {
    const person = normalizeContact(contact, job);
    const emailKey = person.email.toLowerCase();
    const linkedInKey = person.linkedinUrl.toLowerCase();
    if ((emailKey && suppressedEmails.has(emailKey))) { metrics.suppressed += 1; continue; }
    if ((emailKey && knownEmails.has(emailKey)) || (linkedInKey && knownLinkedIns.has(linkedInKey))) { metrics.duplicates += 1; continue; }

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
    const status = scored.score >= config.minimumScoreToDraft ? "Qualified" : scored.score >= 40 ? "New" : "Rejected";
    const notes = [`source_url=${person.sourceUrl}`, `apply_url=${job.applyUrl || job.jobUrl}`, `opportunity_score=${job.opportunityScore || ""}`, `public_contact=${job.publicContactEmail || ""}`, `enrichment=${person.enrichmentProvider}`, `verification=${verification.provider}:${verification.state}:${verification.score}`].filter(Boolean).join("; ");
    leadIdsForSignal.push(id);
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

    metrics.contactableLeads += 1;

    if (scored.score >= config.minimumScoreToDraft && !["invalid", "undeliverable", "risky"].includes(String(verification.state).toLowerCase())) {
      const draft = buildInitialDraft({ firstName: person.firstName, fullName: person.fullName, email: person.email, company: person.company, title: person.title, angle, resumeUrl: config.resumeUrl });
      queue.push([`queue_${crypto.randomUUID()}`, id, scored.priority, "Initial", draft.subject, draft.body, "Pending", "Send on Approval", "", "Not Sent", ""]);
      metrics.queuedDrafts += 1;
    }
  }

  if (!knownSignalKeys.has(signalKey)) {
    hiringSignals.push([
      signalId,
      nowIso(),
      job.provider,
      job.companyName,
      job.companyWebsite,
      job.companyDomain,
      job.jobTitle,
      job.jobUrl,
      job.location,
      job.department,
      `${job.provider} shows active hiring for ${job.jobTitle}. Apply: ${job.applyUrl || job.jobUrl}`,
      `${job.jobTitle} · score ${job.opportunityScore || "n/a"}`,
      contactableContacts.length ? "Contact-ready lead found" : "Application link captured; needs contact/enrichment",
      contactableContacts.length,
      leadIdsForSignal.join(", "),
      [`score=${job.opportunityScore || ""}`, `apply_url=${job.applyUrl || job.jobUrl}`, `public_contact=${job.publicContactEmail || ""}`, contactableContacts.length ? "Copied contact-ready contact to Leads" : "Stored as hiring signal/application opportunity"].filter(Boolean).join("; "),
    ]);
    metrics.hiringSignals += 1;
  }
}

const zeroContactableWarning = jobs.length > 0 && metrics.contactableLeads === 0;
if (zeroContactableWarning) {
  activity.push([
    `activity_${crypto.randomUUID()}`,
    nowIso(),
    "Sourcing Warning",
    "Daily Source",
    "Contact-ready lead creation",
    "Warning",
    `Checked ${jobs.length} hiring signal(s) but produced zero contactable leads/drafts; inspect domain extraction and enrichment credentials.`,
  ]);
}

const metricRow = [todayDate(), metrics.hiringSignals, metrics.contactableLeads, leads.filter((row) => row[18] === "Qualified").length, queue.length, 0, 0, 0, 0, 0, metrics.suppressed, "Free-first public API waterfall", `sources=Himalayas,Remotive,Jobicy,Arbeitnow,HN,Greenhouse,Lever; contacts=${metrics.enrichedContacts}; duplicates=${metrics.duplicates}; manual_review_opportunities=${metrics.manualReview}; zero_contactable_warning=${zeroContactableWarning}`];

if (commit) {
  await appendRows(config.spreadsheetId, "Hiring Signals", hiringSignals);
  await appendRows(config.spreadsheetId, "Leads", leads);
  await appendRows(config.spreadsheetId, "Outreach Queue", queue);
  await appendRows(config.spreadsheetId, "Activity Log", activity);
  await appendRows(config.spreadsheetId, "Daily Metrics", [metricRow]);
}

console.log(JSON.stringify({ commit, jobsChecked: jobs.length, insertedHiringSignals: hiringSignals.length, insertedContactableLeads: leads.length, queuedDrafts: queue.length, activityEvents: activity.length, zeroContactableWarning, metrics }, null, 2));

if (commit && minContactable > 0 && leads.length < minContactable) {
  throw new Error(`Daily sourcing produced ${leads.length} contactable lead(s), below required minimum ${minContactable}. Check enrichment/provider health instead of silently passing.`);
}
