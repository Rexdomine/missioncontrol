export const sidebarItems = [
  { label: "Today", state: "Live", active: true },
  { label: "Projects", state: "Queued" },
  { label: "Calendar", state: "Queued" },
  { label: "Job Hunt", state: "Queued" },
  { label: "Content", state: "Queued" },
  { label: "Approvals", state: "Live" },
  { label: "Chat", state: "Live" },
];

export const focusItems = [
  {
    title: "Birthday content shoot lock-in",
    detail: "Call Moeshen Art Gallery, confirm access rules, and pick a shoot window before May 8.",
    tag: "Priority 1",
  },
  {
    title: "Mission Control Phase 1",
    detail: "Ship shell, Today cockpit, approvals visibility, and StarLord command surface.",
    tag: "In Build",
  },
  {
    title: "Role hunt review",
    detail: "Keep weekday automation running and review shortlist quality on Monday morning.",
    tag: "Monitor",
  },
];

export const agendaItems = [
  {
    time: "09:00",
    title: "Mission Control planning block",
    note: "Architecture locked. Move into UI and interaction decisions.",
  },
  {
    time: "13:00",
    title: "Call Moeshen Art Gallery",
    note: "Reminder already scheduled with contact numbers.",
  },
  {
    time: "16:30",
    title: "Content concept refinement",
    note: "Confirm shoot goal, outfits, and posting angle.",
  },
];

export const projectPulse = [
  {
    name: "Mission Control",
    status: "Active",
    next: "Complete Today dashboard and approval center UI.",
  },
  {
    name: "Remote Role Hunt",
    status: "Stable",
    next: "Observe Monday run and refine shortlist quality signals.",
  },
  {
    name: "Birthday Content",
    status: "Planning",
    next: "Secure location, then turn concept into a shot list.",
  },
];

export const approvalItems = [
  {
    title: "Stale Telegram approval prompts",
    severity: "Medium",
    source: "OpenClaw cron maintenance",
    action: "Track and eliminate approval-oriented execution regressions.",
  },
  {
    title: "Mission Control dependency install",
    severity: "Low",
    source: "Local app bootstrap",
    action: "Install dependencies before first runtime verification.",
  },
];

export const alerts = [
  {
    type: "Signal",
    title: "Daily memory cleanup completed",
    body: "Cron is healthy. Approval noise is a workflow bug, not a stuck task.",
  },
  {
    type: "Build",
    title: "Mission Control repo scaffolded",
    body: "Architecture, phase roadmap, and product shell are now in repo.",
  },
];

export const chatThreads = [
  {
    title: "Build Mission Control Phase 1",
    summary: "Shell, Today view, approvals, and base chat panel in progress.",
    status: "Active",
  },
  {
    title: "Birthday content planning",
    summary: "Need gallery confirmation, concept, and timeline before May 8.",
    status: "Queued",
  },
  {
    title: "Weekly role-hunt standard",
    summary: "Polished email template locked in as default for job-hunt sends.",
    status: "Stable",
  },
];

export const quickActions = [
  "Summarize what matters today",
  "Show me blockers across active work",
  "Draft a booking message for the gallery",
  "Prepare Monday job-hunt review checklist",
];
