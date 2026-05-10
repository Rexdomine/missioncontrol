export function selectTemplate(title = "") {
  const normalized = title.toLowerCase();
  if (/(recruit|talent|people)/.test(normalized)) return "recruiter";
  if (/(agency|partner|consult)/.test(normalized)) return "agency";
  if (/(cto|engineering|engineer|technical)/.test(normalized)) return "cto";
  return "founder";
}

export function buildInitialDraft({ firstName, company, title, angle }) {
  const safeFirstName = firstName || "there";
  const safeCompany = company || "your team";
  const safeAngle = angle || "the product work your team is doing";
  const template = selectTemplate(title);

  if (template === "recruiter") {
    return {
      template,
      subject: "AI-native full-stack engineer exploring roles",
      body: `Hi ${safeFirstName},\n\nI saw that you work with ${safeCompany} and wanted to reach out directly.\n\nI’m Princewill, an AI-native full-stack engineer and founder of CounterFix. My background covers React, Python, FastAPI, AI workflow automation, integrations, and shipping production-ready products end-to-end.\n\nI’m currently exploring full-time or contract roles across AI engineering, full-stack engineering, product engineering, and automation-heavy software roles.\n\nIf there’s an opening where this background could fit, I’d be happy to share more or jump on a quick call.\n\nBest,\nPrincewill Ejiogu\n\nP.S. If this is not relevant, feel free to let me know and I won’t follow up.`,
    };
  }

  if (template === "agency") {
    return {
      template,
      subject: `Helping ${safeCompany} ship AI/software projects faster`,
      body: `Hi ${safeFirstName},\n\nI came across ${safeCompany} and noticed your team works around ${safeAngle}.\n\nI’m Princewill, an AI-native full-stack engineer and technical founder. I help build and ship software products across frontend, backend, AI workflows, automations, integrations, and production systems.\n\nI’m currently open to contract or full-time opportunities where I can support teams delivering client projects, especially around AI-powered tools, SaaS platforms, and internal automation systems.\n\nWould you be open to a quick chat this week?\n\nBest,\nPrincewill Ejiogu\n\nP.S. If this is not relevant, feel free to let me know and I won’t follow up.`,
    };
  }

  if (template === "cto") {
    return {
      template,
      subject: `Full-stack / AI engineering help for ${safeCompany}`,
      body: `Hi ${safeFirstName},\n\nI noticed ${safeCompany} is working on ${safeAngle}, and it seems like the kind of environment where strong product engineering speed matters.\n\nI’m Princewill, an AI-native full-stack engineer with founder experience. I work across React, Python/FastAPI, backend systems, automation workflows, AI tooling, integrations, and production deployment.\n\nI’m currently looking for engineering opportunities where I can help a team ship faster, especially around AI-powered products, internal tools, and SaaS systems.\n\nWould it make sense to have a short conversation to see if my background fits anything you’re building or hiring for?\n\nBest,\nPrincewill Ejiogu\n\nP.S. If this is not relevant, feel free to let me know and I won’t follow up.`,
    };
  }

  return {
    template,
    subject: `AI/full-stack engineering support for ${safeCompany}`,
    body: `Hi ${safeFirstName},\n\nI came across ${safeCompany} and liked what you’re building around ${safeAngle}.\n\nI’m Princewill, an AI-native full-stack engineer and founder of CounterFix, a product authentication platform. I’ve built across React, Python, FastAPI, AI workflows, automation, integrations, and production systems — so I’m strongest where teams need someone who can move from idea to working software quickly.\n\nI’m currently exploring full-time or contract engineering roles where I can help build AI-powered products, internal tools, automations, or SaaS platforms.\n\nWould you be open to a quick conversation this week to see if there’s a fit?\n\nBest,\nPrincewill Ejiogu\n\nP.S. If this is not relevant, feel free to let me know and I won’t follow up.`,
  };
}
