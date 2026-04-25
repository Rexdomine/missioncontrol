# Mission Control Architecture

## Objective

Mission Control is a visual operations dashboard for Rex and StarLord.

It is the human-facing control plane for:

- daily priorities
- projects and decisions
- calendar awareness
- job hunt workflows
- content workflows
- approvals and alerts
- direct interaction with StarLord

Version 2 is intentionally practical:

- real web app
- clear operational modules
- lightweight but extensible architecture
- fast time to usable value

## Technical Stack

- Frontend: Next.js App Router, React, TypeScript
- Backend: Supabase Postgres
- Realtime and events: Supabase Realtime for lightweight live updates
- Auth: Supabase Auth
- Validation: Zod
- Styling: app-local CSS initially, with room to move into a design token system
- Automation bridge: API routes or server actions that invoke local services and connectors

## Core Principles

1. One dashboard, multiple workflows
   Mission Control should feel like one operating surface, not separate tools stitched together.

2. Human-readable first
   Rex should understand state at a glance without opening several tools.

3. Suggestion and action together
   Every module should show current state and the next useful action.

4. Start thin, keep extension points clean
   Early versions should avoid over-modeling while preserving clean data boundaries.

## System Layers

### 1. Presentation Layer

Next.js routes and UI shells for:

- Today
- Projects
- Calendar
- Job Hunt
- Content
- Approvals
- Chat

### 2. Application Layer

Server-side orchestration for:

- dashboard aggregation
- timeline assembly
- task and decision summaries
- workflow status
- alert generation
- chat actions routed to StarLord or helper services

### 3. Data Layer

Supabase/Postgres stores:

- projects
- work items
- calendar snapshots
- job opportunities
- applications
- content items
- approvals
- events
- notes and decisions

### 4. Integration Layer

Adapter services for:

- Google Calendar
- Gmail
- GitHub
- cron state
- local memory files
- future ClickUp, Slack, Drive, or Notion connectors

## App Modules

### Today

Purpose:

- daily agenda
- top priorities
- time-sensitive alerts
- current focus state

Primary UI:

- agenda column
- top priorities strip
- blockers and waiting-on cards
- “ask StarLord” command box

### Projects

Purpose:

- visibility into active work
- stage, risk, delegation, and next action

Primary UI:

- project list
- board or stacked cards
- project detail drawer
- ownership and status chips

### Calendar

Purpose:

- commitments, prep, conflicts, and follow-ups

Primary UI:

- day/week agenda
- prep-needed cards
- schedule conflict alerts
- meeting detail panel

### Job Hunt

Purpose:

- role discovery
- application pipeline
- message and resume tailoring

Primary UI:

- daily shortlist view
- role table with fit score
- application stage tracker
- outreach and notes panel

### Content

Purpose:

- capture ideas
- schedule shoots
- track assets and publishing

Primary UI:

- content calendar
- idea backlog
- production status board
- shot list and asset panel

### Approvals & Alerts

Purpose:

- prevent hidden automation failures
- keep operational anomalies visible

Primary UI:

- approval queue
- alert feed
- automation health summary
- run detail panel

### Chat with StarLord

Purpose:

- command center for planning and action

Primary UI:

- conversation panel
- quick action prompts
- context chips
- recent execution results

## Data Model

## users

- id
- display_name
- email
- timezone

## projects

- id
- name
- slug
- status
- priority
- owner
- summary
- next_action
- risk_level
- created_at
- updated_at

## work_items

- id
- project_id
- module
- title
- status
- due_at
- assignee
- source
- notes

## calendar_events

- id
- external_id
- title
- starts_at
- ends_at
- location
- organizer
- prep_status
- source_payload

## job_roles

- id
- company
- title
- source_url
- posted_at
- location_policy
- fit_score
- status
- notes

## job_applications

- id
- job_role_id
- stage
- applied_at
- follow_up_at
- custom_angle
- notes

## content_items

- id
- title
- type
- stage
- publish_target
- shoot_date
- owner
- notes

## approvals

- id
- source
- status
- reason
- surfaced_at
- resolved_at

## system_alerts

- id
- type
- severity
- title
- body
- source
- created_at
- resolved_at

## activity_events

- id
- module
- event_type
- title
- summary
- actor
- occurred_at
- metadata

## API Surface

Initial endpoints or server actions:

- `/api/dashboard/today`
- `/api/projects`
- `/api/calendar`
- `/api/job-hunt`
- `/api/content`
- `/api/approvals`
- `/api/chat`

## Integration Pattern

Adapters should normalize external systems into app-owned shapes.

Example:

- Gmail summary data becomes timeline items or alerts
- Calendar entries become `calendar_events`
- Job hunt emails and discovery outputs become `job_roles`
- cron failures become `system_alerts`

This keeps the UI stable even when connectors change.

## State Strategy

- server-render module summaries for fast initial load
- hydrate interactive controls where needed
- use lightweight polling or Supabase realtime only where value is clear
- avoid global client state until cross-module interaction truly requires it

## Security and Access

- single primary user model for Rex in v1/v2
- connector secrets stay outside the frontend
- API routes enforce user session and role checks
- approval and execution logs should be visible but sanitized

## Recommended Build Order

1. shell + Today
2. Projects + Calendar
3. Approvals + Chat
4. Job Hunt + Content
5. automation health + cross-module intelligence

## Open Questions

- whether Mission Control should read directly from local memory files or ingest them into database tables
- whether Chat should be embedded live or represented as an action launcher plus transcript panel
- whether initial auth is necessary for a single-user personal deployment or can wait until a shared deployment exists
