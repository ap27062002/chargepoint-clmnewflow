# ChargePoint Enterprise CLM — Agentic Prototype (Unify build)

An **agentic, chat-driven** Contract Lifecycle Management platform for ChargePoint Legal, built by Unify to ChargePoint's PRD v1.1 + the June 23 demo direction. The core interaction is a **CLM Agent** (chat) that drives a live **canvas** (the enterprise workspace) — and the canvas is also directly navigable for power users. This is the "chat **and** canvas" model Eric asked for.

> Prototype: React + Vite + TypeScript + Tailwind, in-memory store, **simulated** CLM agent (deterministic, grounded in the NDA corpus — no API key required). All AI output is labelled AI-generated. The agent never approves terms, sends externally, or signs — attorneys decide.

## Run

```bash
cd chargepoint-clm
npm install
npm run dev        # http://localhost:5190
```

Best viewed at desktop width (≥1280px). It's an internal enterprise app.

## What's implemented (mapped to the PRD)

| PRD deliverable | Where |
|---|---|
| AI assistant experience (agentic) | Left **CLM Agent** chat — drives the canvas, runs redline analysis, walks dispositions, drafts responses, enforces guardrails |
| Dashboard | KPIs, deal pipeline (6 stages), SLA escalations, active-matters table |
| Ticket workspace | **Deal Discussion** + **Agreement Review** tabs, agreement selector pills |
| Agreement review | **Issues View** (deviations sorted by risk, Accept/Counter/Reject) + **Document View** (Word-like, tracked changes w/ party attribution, scroll-to-clause) + **Comments** + **AI Assistant** tabs |
| Playbook editor | NDA playbook v3, provisions w/ standard position / fallback tiers / red lines / rationale / negotiation %, refinement recommendations w/ owner-approval gate |
| Admin console | Routing, SLAs, approvals, notifications, users & RBAC, integrations |
| Notification center | In-app/email/Teams/Slack, severities, mark-read |
| Audit center | Immutable, hash-chained, 15 event types, AI-vs-human actor attribution |
| RBAC | 6 roles, ticket-level access; persona switcher (top-right) gates nav (e.g. Admin hidden for attorneys) |

## Architecture

- `src/types.ts` — domain model; **enums mirror the formal spec exactly** (ticket/agreement/version/deviation/disposition, risk_category, impact_area, direction, etc.).
- `src/data/seed.ts` — corpus-grounded data: Vishay (live redline), Airbus (SLA risk), Northwind (multi-agreement), Mondelez/Clever Devices (executed), the NDA playbook.
- `src/data/documents.ts` — structured document model w/ tracked-change runs + party attribution.
- `src/store.ts` — Zustand store: entities, canvas routing, dispositions, messages, notifications, hash-chained audit, chat.
- `src/agent/engine.ts` — the simulated agent: intent routing → rich responses + canvas effects + real state mutations (create ticket, set dispositions, send guardrail). Swap `route()` for a live Claude call to go from simulated → real.
- `src/views/*` — Dashboard, TicketWorkspace, AgreementReview, IssuesView, DocumentViewer, AIPanel, PlaybookView, AdminView, AuditView, NotificationsView.

## Demo script (2 min)

1. Land on the dashboard; the agent greets with today's 3 priorities.
2. Click **"Review the Vishay redline"** → agent analyzes Draft 2, opens the **Issues View** (9 deviations, residuals red line).
3. **"Why is residuals a red line?"** → playbook-grounded answer; **Document View** shows the tracked-change clause.
4. **"Apply all recommended"** → dispositions set; **"Draft our response"** → clean + redline, guardrail blocks auto-send.
5. Switch persona (top-right) to **Eric Batill** (Playbook Owner) → open **Playbooks** → refinement recommendations; or **Dana Whitfield** (Admin) → **Admin** console.

## Known scope (prototype)

Simulated agent (no live LLM), seeded documents, no real Entra/DocuSign/SharePoint/CRM wiring (those are the integration blockers tracked in the build assessment). The rendering-architecture decision (hosted OOXML editor vs Word/SharePoint iframe) and the collaboration respond-tracking depth remain the open items from the meeting.
