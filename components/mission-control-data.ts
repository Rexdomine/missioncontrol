export type ModuleKey =
  | "today"
  | "projects"
  | "calendar"
  | "job-hunt"
  | "content"
  | "approvals"
  | "chat";

export interface SidebarItem {
  label: string;
  href: string;
  key: ModuleKey;
  status: "live" | "queued";
}

export interface FocusItem {
  id: string;
  title: string;
  detail: string;
  tag: "Priority 1" | "In Build" | "Monitor";
}

export interface AgendaItem {
  id: string;
  time: string;
  title: string;
  note: string;
}

export interface ProjectPulseItem {
  id: string;
  name: string;
  status: "Active" | "Stable" | "Planning";
  next: string;
}

export interface ApprovalItem {
  id: string;
  title: string;
  severity: "Low" | "Medium" | "High";
  source: string;
  action: string;
}

export interface AlertItem {
  id: string;
  type: "Signal" | "Build" | "Warning";
  title: string;
  body: string;
}

export interface ChatThread {
  id: string;
  title: string;
  summary: string;
  status: "Active" | "Queued" | "Stable";
}

export const sidebarItems: SidebarItem[] = [
  { key: "today", label: "Today", href: "/", status: "live" },
  { key: "projects", label: "Projects", href: "/projects", status: "queued" },
  { key: "calendar", label: "Calendar", href: "/calendar", status: "queued" },
  { key: "job-hunt", label: "Job Hunt", href: "/job-hunt", status: "queued" },
  { key: "content", label: "Content", href: "/content", status: "queued" },
  { key: "approvals", label: "Approvals", href: "/approvals", status: "live" },
  { key: "chat", label: "Chat", href: "/chat", status: "live" },
];

export const focusItems: FocusItem[] = [
  {
    id: "focus-birthday-content",
    title: "Birthday content shoot lock-in",
    detail:
      "Call Moeshen Art Gallery, confirm access rules, and pick a shoot window before May 8.",
    tag: "Priority 1",
  },
  {
    id: "focus-phase-one",
    title: "Mission Control Phase 1",
    detail:
      "Ship shell, Today cockpit, approvals visibility, and StarLord command surface.",
    tag: "In Build",
  },
  {
    id: "focus-role-hunt",
    title: "Role hunt review",
    detail:
      "Keep weekday automation running and review shortlist quality on Monday morning.",
    tag: "Monitor",
  },
];

export const agendaItems: AgendaItem[] = [
  {
    id: "agenda-planning-block",
    time: "09:00",
    title: "Mission Control planning block",
    note: "Architecture locked. Move into UI and interaction decisions.",
  },
  {
    id: "agenda-gallery-call",
    time: "13:00",
    title: "Call Moeshen Art Gallery",
    note: "Reminder already scheduled with contact numbers.",
  },
  {
    id: "agenda-content-refinement",
    time: "16:30",
    title: "Content concept refinement",
    note: "Confirm shoot goal, outfits, and posting angle.",
  },
];

export const projectPulse: ProjectPulseItem[] = [
  {
    id: "project-missioncontrol",
    name: "Mission Control",
    status: "Active",
    next: "Complete route structure, interaction states, and runtime verification.",
  },
  {
    id: "project-role-hunt",
    name: "Remote Role Hunt",
    status: "Stable",
    next: "Observe Monday run and refine shortlist quality signals.",
  },
  {
    id: "project-birthday-content",
    name: "Birthday Content",
    status: "Planning",
    next: "Secure location, then turn concept into a shot list.",
  },
];

export const approvalItems: ApprovalItem[] = [
  {
    id: "approval-telegram-noise",
    title: "Stale Telegram approval prompts",
    severity: "Medium",
    source: "OpenClaw cron maintenance",
    action: "Track and eliminate approval-oriented execution regressions.",
  },
  {
    id: "approval-bootstrap",
    title: "Mission Control dependency install",
    severity: "Low",
    source: "Local app bootstrap",
    action: "Install dependencies before first runtime verification.",
  },
];

export const alerts: AlertItem[] = [
  {
    id: "alert-memory-cleanup",
    type: "Signal",
    title: "Daily memory cleanup completed",
    body: "Cron is healthy. Approval noise is a workflow bug, not a stuck task.",
  },
  {
    id: "alert-repo-scaffolded",
    type: "Build",
    title: "Mission Control repo scaffolded",
    body: "Architecture, phase roadmap, and product shell are now in repo.",
  },
];

export const chatThreads: ChatThread[] = [
  {
    id: "thread-phase-one",
    title: "Build Mission Control Phase 1",
    summary: "Shell, Today view, approvals, and base chat panel in progress.",
    status: "Active",
  },
  {
    id: "thread-birthday-content",
    title: "Birthday content planning",
    summary: "Need gallery confirmation, concept, and timeline before May 8.",
    status: "Queued",
  },
  {
    id: "thread-role-hunt-standard",
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

export function getActiveModule(pathname: string): ModuleKey {
  if (pathname === "/approvals") return "approvals";
  if (pathname === "/chat") return "chat";
  if (pathname === "/projects") return "projects";
  if (pathname === "/calendar") return "calendar";
  if (pathname === "/job-hunt") return "job-hunt";
  if (pathname === "/content") return "content";
  return "today";
}
