import fs from "node:fs";
import path from "node:path";

const WORKSPACE_ROOT = "/home/node/.openclaw/workspace";
const DEFAULT_STATE_FILE = path.join(WORKSPACE_ROOT, "state/job-outreach-live.env");
const OPENCLAW_CONFIG_PATH = "/home/node/.openclaw/openclaw.json";

export const requiredLiveKeys = [
  "JOB_OUTREACH_SPREADSHEET_ID",
  "JOB_OUTREACH_SENDER_EMAIL",
  "CALENDLY_LINK",
];

export const optionalSourcingKeys = [
  "FINDYMAIL_API_KEY",
  "LEADMAGIC_API_KEY",
  "HUNTER_API_KEY",
  "DROPCONTACT_API_KEY",
];

export function loadDotEnv(filePath = process.env.JOB_OUTREACH_ENV_FILE || DEFAULT_STATE_FILE) {
  if (!fs.existsSync(filePath)) return { filePath, loaded: false };
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return { filePath, loaded: true };
}

export function readOpenClawApiKey() {
  if (process.env.MATON_API_KEY) return process.env.MATON_API_KEY;
  const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG_PATH, "utf8"));
  const apiKey = config?.skills?.entries?.["api-gateway"]?.apiKey;
  if (!apiKey || typeof apiKey !== "string") {
    throw new Error(`Missing api-gateway key at ${OPENCLAW_CONFIG_PATH}`);
  }
  return apiKey;
}

export function getJobOutreachConfig() {
  loadDotEnv();
  return {
    findymailApiKey: process.env.FINDYMAIL_API_KEY || "",
    findymailApiBase: process.env.FINDYMAIL_API_BASE || "https://app.findymail.com",
    leadMagicApiKey: process.env.LEADMAGIC_API_KEY || "",
    leadMagicApiBase: process.env.LEADMAGIC_API_BASE || "https://api.leadmagic.io",
    hunterApiKey: process.env.HUNTER_API_KEY || "",
    hunterApiBase: process.env.HUNTER_API_BASE || "https://api.hunter.io",
    dropcontactApiKey: process.env.DROPCONTACT_API_KEY || "",
    dropcontactApiBase: process.env.DROPCONTACT_API_BASE || "https://api.dropcontact.io",
    targetRoles: (process.env.JOB_OUTREACH_TARGET_ROLES || "AI Native Fullstack Engineer,AI Engineer,Full Stack Engineer,Product Engineer,Founding Engineer,Frontend Engineer,Backend Engineer,Solutions Engineer").split(/[\n,]/).map((role) => role.trim()).filter(Boolean),
    decisionMakerTitles: (process.env.JOB_OUTREACH_DECISION_MAKER_TITLES || "Founder,Co-Founder,CEO,CTO,Head of Engineering,VP Engineering,Engineering Manager,Head of Product,Technical Recruiter,Talent Partner,AI Product Lead").split(/[\n,]/).map((title) => title.trim()).filter(Boolean),
    targetCompanies: process.env.JOB_OUTREACH_TARGET_COMPANIES_JSON ? JSON.parse(process.env.JOB_OUTREACH_TARGET_COMPANIES_JSON) : [],
    spreadsheetId: process.env.JOB_OUTREACH_SPREADSHEET_ID || "",
    senderEmail: process.env.JOB_OUTREACH_SENDER_EMAIL || "",
    senderName: process.env.JOB_OUTREACH_SENDER_NAME || "Princewill Ejiogu",
    calendlyLink: process.env.CALENDLY_LINK || "",
    calendlyApiKey: process.env.CALENDLY_API_KEY || "",
    resumePath: process.env.JOB_OUTREACH_RESUME_PATH || "",
    dailyLeadLimit: Number(process.env.JOB_OUTREACH_DAILY_LEAD_LIMIT || 50),
    dailySendLimit: Number(process.env.JOB_OUTREACH_DAILY_SEND_LIMIT || 25),
    minimumScoreToDraft: Number(process.env.JOB_OUTREACH_MIN_SCORE_TO_DRAFT || 70),
    mode: process.env.JOB_OUTREACH_MODE || "draft_only",
  };
}

export function validateLiveConfig({ allowMissingSourcingKeys = false } = {}) {
  const config = getJobOutreachConfig();
  const missing = [];
  if (!config.spreadsheetId) missing.push("JOB_OUTREACH_SPREADSHEET_ID");
  if (!config.senderEmail) missing.push("JOB_OUTREACH_SENDER_EMAIL");
  if (!config.calendlyLink) missing.push("CALENDLY_LINK");
  if (!allowMissingSourcingKeys && !config.findymailApiKey && !config.leadMagicApiKey) missing.push("FINDYMAIL_API_KEY or LEADMAGIC_API_KEY");
  return { config, missing, ready: missing.length === 0 };
}

export function redact(value) {
  if (!value) return "missing";
  if (value.length <= 8) return "present";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
