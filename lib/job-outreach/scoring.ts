export interface LeadScoringSignals {
  decisionMaker: boolean;
  targetCompanyType: boolean;
  hiringEngineers: boolean;
  skillMatch: boolean;
  remoteFriendly: boolean;
  startupFriendlySize: boolean;
  personalizationAngle: boolean;
}

export function scoreLead(signals: LeadScoringSignals) {
  const score =
    (signals.decisionMaker ? 20 : 0) +
    (signals.targetCompanyType ? 20 : 0) +
    (signals.hiringEngineers ? 20 : 0) +
    (signals.skillMatch ? 15 : 0) +
    (signals.remoteFriendly ? 10 : 0) +
    (signals.startupFriendlySize ? 10 : 0) +
    (signals.personalizationAngle ? 5 : 0);

  if (score >= 80) return { score, action: "High-priority draft", priority: "High" as const };
  if (score >= 70) return { score, action: "Draft for approval", priority: "Medium" as const };
  if (score >= 40) return { score, action: "Save only", priority: "Low" as const };
  return { score, action: "Reject", priority: "Low" as const };
}
