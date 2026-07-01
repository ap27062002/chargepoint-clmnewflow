# Project state — resume here

**App:** ChargePoint Legal CLM — agent-first, chat-driven CLM prototype (Unify build).
**Live:** https://chargepoint-clm.vercel.app · **Current build:** `build-13` (git tag) · repo clean.
**Stack:** React + Vite + TS + Tailwind + Zustand. In-memory store; simulated agent with live-Claude fallback (`/api/chat`, needs `ANTHROPIC_API_KEY` in Vercel to activate).

## Run / deploy / revert
- Run: `cd chargepoint-clm && npm install && npm run dev` → http://localhost:5190
- Deploy: `NODE_OPTIONS="--use-system-ca" npx vercel deploy --prod --yes --scope bansal-s-projects --token=<token>` (token good ~30d from 2026-06-27; system-CA + sandbox-off required — see VERSIONING.md)
- Revert (one prompt): "revert to the previous build" → `vercel rollback`. Builds also tagged in git (`build-4`…`build-7`).

## Done (builds 1→7)
1 original 14-screen app · 2 agent-first redesign (hero + side-by-side, ⌘K palette) · 3 RBAC (starters/palette/agent-denial/row-scoping) · 4 "make it real" (live-Claude wiring, real track-changes editor, e-sign/exec, approvals/routing/SLA engines, computed analytics, version diff) · 5 visible lifecycle stage tracker + inline approval chain · 6 redesigned Deal Summary + signed/executed document (view + download + DocuSign completion certificate) · 7 execution auto-resolves open deviations · 8 UX refinements: left nav (Agent/Dashboard/Playbook, RBAC-gated), click-to-open agent (no auto-open — user clicks the artifact chip), removed Negotiation stage, leaner StageTracker, Agreements pill only for multi-agreement tickets, right rail defaults to AI Assistant, starter renames · 9 Slack landing entry screen, Agreements repository ("Files" — folder tree of agreements+versions), Ask-AI on document text selection, playbook tier + Residuals(red line)/Permitted Purpose(deferred) provisions + filter bar, right rail opens neither Comments nor AI by default · 10 rail nav (Dashboard/Files/Playbook) opens full-width with agent collapsed (one click away) via canvas.solo, agreement right rail collapses to a thin icon strip when closed, Ask-AI on a doc selection routes into the right-hand AI Assistant · 11 CIO demo (from the Ironclad recording): agentic NDA intake (one prompt → counterparty resolve + inference + auto-fill, confirm + signer only), Leadership Overview dashboard (leader KPIs/ball-in-court/attention/funnel/by-counterparty), contracts list (Ironclad-style all-records, one click from dashboard, not on nav rail) · 12 **all of Eric's GC use-case feedback**: doc-centric review (doc+issue-directive split, agent collapsed), send-back clean-copy+word-redline (+renamed lifecycle), many-to-one deal overview + multi-doc execution, AI→playbook-only, suggest-to-playbook queue, nested MSA playbook + NL creation, Templates/Projects area. Brief: ../chargepoint-legal-hub/ERIC-FEEDBACK-2026-06-30.md.

## Open / offered next steps (not done)
- **Live Claude:** set `ANTHROPIC_API_KEY` in Vercel project to switch the agent from simulated → real (plumbing is built).
- **Real backend/persistence + integrations** (Entra/DocuSign/SharePoint/CRM are simulated), tests, accessibility, Azure/CI-CD — the production build.
- Smaller offered tweaks: gate negotiation→re-send with an approval; push the repo to GitHub for Vercel Git integration (auto-deploy + previews).
- Rotate the Vercel token (was pasted in chat).

## Key context (also in auto-memory)
User = Vaibhav @ **Unify** (vendor) building for **ChargePoint Legal** (customer; Eric Batill). Engagement docs in `../chargepoint-legal-hub/` (MEETING-BRIEF, UNIFY-BUILD-ASSESSMENT, CHARGEPOINT-OPEN-QUESTIONS, RENDERING-ARCHITECTURE-PROPOSAL, CANONICAL-DATA-DICTIONARY). Gotcha: zustand selectors must not return fresh `.filter()` arrays (infinite loop) — select base array, derive in body.
