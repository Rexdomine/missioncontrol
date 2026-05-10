const decisionMakerRegex = /(founder|co-founder|ceo|cto|head of engineering|vp engineering|engineering manager|head of product|product lead|technical recruiter|talent partner|ai product lead|startup operator|managing partner)/i;
const companyRegex = /(ai|saas|automation|studio|product|fintech|healthtech|developer|workflow|blockchain|web3|logistics|consult)/i;
const skillRegex = /(python|react|fastapi|full.?stack|backend|ai|automation|workflow|product engineer|founding engineer|solutions engineer)/i;
const remoteRegex = /(remote|global|distributed|worldwide|emea|africa|contract)/i;

export function inferSignals(lead) {
  const title = lead.title || lead.jobTitle || "";
  const companyText = [lead.company, lead.industry, lead.companyIndustry, lead.keywords, lead.description].filter(Boolean).join(" ");
  const hiringText = [lead.hiringSignal, lead.currentHiringTitles, lead.organization?.job_postings, lead.organization?.keywords].filter(Boolean).join(" ");
  const locationText = [lead.location, lead.companyLocation, lead.organization?.city, lead.organization?.country].filter(Boolean).join(" ");
  const size = Number(lead.companySize || lead.employeeCount || lead.organization?.estimated_num_employees || 0);
  return {
    decisionMaker: decisionMakerRegex.test(title),
    targetCompanyType: companyRegex.test(companyText),
    hiringEngineers: skillRegex.test(hiringText) || /hiring|careers|open role|job/i.test(hiringText),
    skillMatch: skillRegex.test(`${title} ${companyText} ${hiringText}`),
    remoteFriendly: remoteRegex.test(`${locationText} ${hiringText} ${companyText}`),
    startupFriendlySize: size > 0 ? size >= 2 && size <= 200 : true,
    personalizationAngle: Boolean(lead.personalizationAngle || lead.company || lead.organization?.name),
  };
}

export function scoreLead(signals) {
  const score =
    (signals.decisionMaker ? 20 : 0) +
    (signals.targetCompanyType ? 20 : 0) +
    (signals.hiringEngineers ? 20 : 0) +
    (signals.skillMatch ? 15 : 0) +
    (signals.remoteFriendly ? 10 : 0) +
    (signals.startupFriendlySize ? 10 : 0) +
    (signals.personalizationAngle ? 5 : 0);
  if (score >= 80) return { score, action: "High-priority draft", priority: "High" };
  if (score >= 70) return { score, action: "Draft for approval", priority: "Medium" };
  if (score >= 40) return { score, action: "Save only", priority: "Low" };
  return { score, action: "Reject", priority: "Low" };
}

export function buildPersonalizationAngle(lead, signals) {
  if (lead.personalizationAngle) return lead.personalizationAngle;
  const company = lead.company || lead.organization?.name || "the company";
  if (signals.hiringEngineers && signals.skillMatch) return `${company} appears to be hiring for engineering work that maps to React, Python/FastAPI, AI, or automation.`;
  if (signals.targetCompanyType) return `${company} fits the AI/SaaS/automation/product-company target profile.`;
  return `${company} may be relevant for AI-native full-stack engineering outreach, pending human review.`;
}
