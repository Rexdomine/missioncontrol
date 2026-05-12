export function selectTemplate(title = "") {
  const normalized = title.toLowerCase();
  if (/(recruit|talent|people)/.test(normalized)) return "recruiter";
  if (/(agency|partner|consult)/.test(normalized)) return "agency";
  if (/(cto|engineering|engineer|technical)/.test(normalized)) return "cto";
  return "founder";
}

function normalizeAngle(angle = "", company = "") {
  const companyPattern = company ? company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
  let cleaned = String(angle || "").trim();
  if (companyPattern) {
    cleaned = cleaned.replace(new RegExp(`^${companyPattern}\\s+(is\\s+)?(actively\\s+)?hiring\\s+for\\s+`, "i"), "");
    cleaned = cleaned.replace(new RegExp(`^${companyPattern}\\s+(is\\s+)?(actively\\s+)?hiring\\s+`, "i"), "");
    cleaned = cleaned.replace(new RegExp(`^${companyPattern}\\s+(appears\\s+to\\s+be\\s+)?hiring\\s+for\\s+`, "i"), "");
    cleaned = cleaned.replace(new RegExp(`^${companyPattern}\\s+is\\s+looking\\s+for\\s+`, "i"), "");
  }
  cleaned = cleaned.replace(/^is\s+(actively\s+)?hiring\s+for\s+/i, "");
  cleaned = cleaned.replace(/^is\s+(actively\s+)?hiring\s+/i, "");
  cleaned = cleaned.replace(/^is\s+looking\s+for\s+/i, "");
  cleaned = cleaned.replace(/\s+via\s+(Himalayas|Remotive|Jobicy|Arbeitnow|HN Who.?s Hiring|Greenhouse|Lever)(\s+public\s+job\s+API)?\.?$/i, "");
  cleaned = cleaned.replace(/,\s+(which maps|and it seems).+$/i, "");
  cleaned = cleaned.replace(/[.;,]+$/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned || "the product work your team is doing";
}

function isHiringAngle(angle = "") {
  return /hiring|open role|senior software engineer|engineer|developer/i.test(angle);
}

function humanizeHiringAngle(angle = "") {
  const parts = String(angle).split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const role = parts[0].replace(/\s+role$/i, "");
    const remote = parts.find((part) => /remote|hybrid|onsite/i.test(part));
    const focus = parts.find((part) => !/remote|hybrid|onsite/i.test(part) && part !== parts[0])?.replace(/\s+software\s+role$/i, "").replace(/\s+role$/i, "");
    const locationPrefix = remote ? `${remote.toLowerCase()} ` : "";
    const focusSuffix = focus ? ` focused on ${focus}` : "";
    return `a ${locationPrefix}${role} role${focusSuffix}`;
  }
  if (/^(a|an|the)\s+/i.test(angle)) return angle;
  if (/\brole\b/i.test(angle)) return `a ${angle}`;
  return angle;
}

function buildOpening({ company, angle, fallback }) {
  const safeCompany = company || "your team";
  const safeAngle = normalizeAngle(angle, safeCompany);
  if (isHiringAngle(angle) || isHiringAngle(safeAngle)) {
    return `I saw ${safeCompany} is hiring for ${humanizeHiringAngle(safeAngle)}, and it seems like the kind of environment where strong product engineering speed matters.`;
  }
  return fallback(safeCompany, safeAngle);
}

function withCvLink(body, resumeUrl = "") {
  if (!resumeUrl || /CV:\s*https?:\/\/|resume:\s*https?:\/\//i.test(body)) return body;
  return body.replace("\n\nBest,", `\n\nCV: ${resumeUrl}\n\nBest,`);
}

const GENERIC_NAME_PATTERN = /^(hi|hello|dear|hiring|careers?|jobs?|recruit(?:ing|ment|er)?|talent|people|hr|human|humans|team|info|contact|support|admin|help|sales|office|ops|operations|service|customer|customers|success|partnerships?|partners?|press|media|enquiries|inquiries|hello|inbox|mail|notes?|applications?|apply|founders?)$/i;
const GENERIC_EMAIL_LOCAL_PATTERN = /^(hi|hello|hiring|careers?|jobs?|recruit(?:ing|ment|er)?|talent|people|hr|human|humans|team|info|contact|support|admin|help|sales|office|ops|operations|service|customer|customers|success|partnerships?|partners?|press|media|enquiries|inquiries|inbox|mail|notes?|applications?|apply)$/i;

function titleCaseName(value = "") {
  return String(value || "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function firstNameFromEmail(email = "") {
  const local = String(email || "").split("@")[0] || "";
  if (!local || GENERIC_EMAIL_LOCAL_PATTERN.test(local)) return "";
  const firstPart = local.split(/[._+-]/).find(Boolean) || "";
  if (!firstPart || GENERIC_NAME_PATTERN.test(firstPart) || /\d/.test(firstPart)) return "";
  return titleCaseName(firstPart);
}

export function greetingName({ firstName, fullName, email } = {}) {
  const candidate = titleCaseName(firstName || fullName || "").split(" ")[0] || "";
  if (candidate && !GENERIC_NAME_PATTERN.test(candidate)) return candidate;
  const fromEmail = firstNameFromEmail(email);
  if (fromEmail) return fromEmail;
  return "there";
}

function normalizeBodyText(body = "") {
  return String(body || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\bfullstack\b/gi, "full-stack")
    .replace(/\bAI native\b/g, "AI-native")
    .replace(/\bfastapi\b/gi, "FastAPI")
    .replace(/\bjavascript\b/gi, "JavaScript")
    .replace(/\btypescript\b/gi, "TypeScript")
    .replace(/\breact\b/g, "React")
    .replace(/\bpython\b/g, "Python")
    .trim();
}

export function reviewOutreachDraft(draft, { firstName, fullName, email, resumeUrl } = {}) {
  const issues = [];
  const reviewed = { ...draft };
  const expectedGreeting = greetingName({ firstName, fullName, email });
  const genericGreetingPattern = /^(Hi|Hello|Dear)\s+(hi|hello|dear|hiring|career|careers|job|jobs|recruiting|recruitment|recruiter|talent|people|hr|human|humans|team|info|contact|support|admin|help|sales|office|ops|operations|service|customer|customers|success|partnership|partnerships|partner|partners|press|media|enquiries|inquiries|inbox|mail|note|notes|application|applications|apply|founder|founders),/i;
  let body = normalizeBodyText(reviewed.body);

  if (genericGreetingPattern.test(body)) {
    issues.push("generic_email_greeting_normalized");
    body = body.replace(genericGreetingPattern, "Hi there,");
  }

  const firstLine = body.split("\n", 1)[0] || "";
  if (/^Hi\s+there,/i.test(firstLine) && expectedGreeting !== "there") {
    body = body.replace(/^Hi\s+there,/i, `Hi ${expectedGreeting},`);
    issues.push("personal_greeting_restored");
  } else if (/^Hi\s+[^,\n]+,/i.test(firstLine) && expectedGreeting === "there") {
    body = body.replace(/^Hi\s+[^,\n]+,/i, "Hi there,");
    issues.push("generic_greeting_enforced");
  }

  if (!/^Hi\s+[^,\n]+,\n\n/.test(body)) {
    body = body.replace(/^(Hi\s+[^,\n]+,)[ \t]*\n?/, "$1\n\n");
    issues.push("greeting_spacing_fixed");
  }

  if (!/\n\nBest,\nPrincewill Ejiogu\b/.test(body)) {
    issues.push("missing_signature");
  }
  if (resumeUrl && !new RegExp(`CV:\\s*${resumeUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(body)) {
    body = withCvLink(body, resumeUrl);
    issues.push("cv_link_restored");
  }
  if (/\{\{|\}\}|\[\[|\]\]|undefined|null/i.test(body)) {
    issues.push("unresolved_placeholder_detected");
  }

  reviewed.body = body;
  reviewed.review = {
    status: issues.some((issue) => issue === "missing_signature" || issue === "unresolved_placeholder_detected") ? "needs_manual_review" : "passed",
    issues,
  };
  return reviewed;
}

function reviewedDraft(draft, context) {
  return reviewOutreachDraft(draft, context);
}

export function buildInitialDraft({ firstName, fullName, email, company, title, angle, resumeUrl }) {
  const safeFirstName = greetingName({ firstName, fullName, email });
  const safeCompany = company || "your team";
  const template = selectTemplate(title);

  if (template === "recruiter") {
    return reviewedDraft({
      template,
      subject: "AI-native full-stack engineer exploring roles",
      body: withCvLink(`Hi ${safeFirstName},\n\nI saw that you work with ${safeCompany} and wanted to reach out directly.\n\nI’m Princewill, an AI-native full-stack engineer and founder of CounterFix. My background covers React, Python, FastAPI, AI workflow automation, integrations, and shipping production-ready products end-to-end.\n\nI’m currently exploring full-time or contract roles across AI engineering, full-stack engineering, product engineering, and automation-heavy software roles.\n\nIf there’s an opening where this background could fit, I’d be happy to share more or jump on a quick call.\n\nBest,\nPrincewill Ejiogu\n\nP.S. If this is not relevant, feel free to let me know and I won’t follow up.`, resumeUrl),
    }, { firstName, fullName, email, resumeUrl });
  }

  if (template === "agency") {
    return reviewedDraft({
      template,
      subject: `Helping ${safeCompany} ship AI/software projects faster`,
      body: withCvLink(`Hi ${safeFirstName},\n\n${buildOpening({ company: safeCompany, angle, fallback: (companyName, angleText) => `I came across ${companyName} and noticed your team works around ${angleText}.` })}\n\nI’m Princewill, an AI-native full-stack engineer and technical founder. I help build and ship software products across frontend, backend, AI workflows, automations, integrations, and production systems.\n\nI’m currently open to contract or full-time opportunities where I can support teams delivering client projects, especially around AI-powered tools, SaaS platforms, and internal automation systems.\n\nWould you be open to a quick chat this week?\n\nBest,\nPrincewill Ejiogu\n\nP.S. If this is not relevant, feel free to let me know and I won’t follow up.`, resumeUrl),
    }, { firstName, fullName, email, resumeUrl });
  }

  if (template === "cto") {
    return reviewedDraft({
      template,
      subject: `Full-stack / AI engineering help for ${safeCompany}`,
      body: withCvLink(`Hi ${safeFirstName},\n\n${buildOpening({ company: safeCompany, angle, fallback: (companyName, angleText) => `I noticed ${companyName} is working on ${angleText}, and it seems like the kind of environment where strong product engineering speed matters.` })}\n\nI’m Princewill, an AI-native full-stack engineer with founder experience. I work across React, Python/FastAPI, backend systems, automation workflows, AI tooling, integrations, and production deployment.\n\nI’m currently looking for engineering opportunities where I can help a team ship faster, especially around AI-powered products, internal tools, and SaaS systems.\n\nWould it make sense to have a short conversation to see if my background fits what ${safeCompany} is hiring for?\n\nBest,\nPrincewill Ejiogu\n\nP.S. If this is not relevant, feel free to let me know and I won’t follow up.`, resumeUrl),
    }, { firstName, fullName, email, resumeUrl });
  }

  return reviewedDraft({
    template,
    subject: `AI/full-stack engineering support for ${safeCompany}`,
    body: withCvLink(`Hi ${safeFirstName},\n\n${buildOpening({ company: safeCompany, angle, fallback: (companyName, angleText) => `I came across ${companyName} and liked what you’re building around ${angleText}.` })}\n\nI’m Princewill, an AI-native full-stack engineer and founder of CounterFix, a product authentication platform. I’ve built across React, Python, FastAPI, AI workflows, automation, integrations, and production systems — so I’m strongest where teams need someone who can move from idea to working software quickly.\n\nI’m currently exploring full-time or contract engineering roles where I can help build AI-powered products, internal tools, automations, or SaaS platforms.\n\nWould you be open to a quick conversation this week to see if there’s a fit?\n\nBest,\nPrincewill Ejiogu\n\nP.S. If this is not relevant, feel free to let me know and I won’t follow up.`, resumeUrl),
  }, { firstName, fullName, email, resumeUrl });
}
