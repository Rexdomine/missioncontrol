# Mission Control

Mission Control is the visual dashboard for working with StarLord.

## Initial Scope

- Today
- Projects
- Calendar
- Job Hunt
- Content
- Approvals & Alerts
- Chat with StarLord

## Repo Contents

- `app/` - Next.js app shell
- `docs/architecture.md` - technical architecture
- `docs/phases.md` - delivery roadmap and UI phases

## Getting Started

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

## Preview Workflow

Default development binds to `127.0.0.1` only. That keeps the Next.js dev server off the LAN unless you explicitly choose otherwise.

Primary testing path:

- open a branch or PR
- let Vercel create the preview deployment
- verify the Vercel preview URL before handoff

Local checks before any preview handoff:

```bash
npm run lint
npm run typecheck
npm run build
```

The dev and build scripts rotate stale `.next` output into `.next.stale-*` so cached runtime artifacts do not poison the next run.

## Local Fallback Preview

If a hosted preview is temporarily unavailable, use the local tunnel only as a short-lived fallback:

```bash
npm run dev
```

In a second terminal:

```bash
npm run preview:tunnel
```

That creates a temporary `trycloudflare.com` URL that forwards to the local app without exposing the dev server directly on the network.

LAN fallback, only when you specifically want same-network device access:

```bash
npm run dev:lan
```

Security notes:

- Prefer Vercel preview deployments over temporary tunnels.
- Prefer the tunnel flow over LAN exposure when a temporary public URL is needed.
- Stop the tunnel when you are done previewing.
- Treat the preview URL as sensitive while it is active.
- Do not use the LAN mode on untrusted or shared networks.

## Notes

This scaffold is intentionally lightweight. It establishes the product shell and architecture before integrating real connectors and workflow state.
