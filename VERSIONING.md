# Versioning & one-prompt revert

This project now has **two layers of version control**, so any build can be restored.

## 1. Git (source history) — from build-4 onward
Local git repo on branch `main`. Each build is a commit + an annotated tag (`build-4`, `build-5`, …).
- See history: `git log --oneline --decorate`
- Revert source to a build: `git reset --hard build-3` (then rebuild + redeploy)

> Git history starts at **build-4** (the point version control was added). Earlier builds are
> not in git, but they ARE preserved as immutable Vercel deployments (below), so they're still revertable.

## 2. Vercel (deployment history) — covers ALL builds, instant
Every build I deployed is kept as an immutable deployment. `vercel rollback <url>` re-points the
production alias (`chargepoint-clm.vercel.app`) to that deployment **instantly, with no rebuild**.

### Build → deployment map (newest first)
| Build | What changed | Deployment | Live? |
|---|---|---|---|
| **build-14** | **Independent audit (116 agents against the source transcript) → 13 genuine build gaps closed.** G1 (blocker): real **@-mention/contributor sign-off composer** — type @ to tag a colleague, optional provision reference; wired in Comments AND Deal Discussion (a shared `MentionComposer`); posted messages carry `mentions` + show "Sign-off requested" / "Mark responded". G2: **direct free-text prose editing** in the document (contentEditable clause text + wired Bold/Italic/List toolbar via a "Edit directly" sub-mode; edits recorded as CP tracked changes). G3: **cumulative-redline toggle now changes the diff math** — cumulative = redline vs the original V1 (whole negotiation), off = vs the version they last sent. G4/G5: **runtime versioning** — "Counterparty sent further redlines" at negotiation loops back to Redline Received and auto-creates a counterparty version + CP working copy. G6: **playbook NL content refinement** — add/remove/re-tier provisions in plain language (in-view chat + guarded engine intent). G7: playbook **source-path + example-vs-template** panel. G8: **publish playbook for different purposes** (4 audience variants). G9: **agent-proactive suggestions from folder ingestion** — a Repository "Add agreements to folder" gesture makes the agent ingest + propose a playbook change (`ai_engine`-attributed suggestion + notification). G10: **finalize-execution-version picker** (latest by default). G11: **contributor-aware "what's on my plate"** (role-aware reply summarizing unresolved @-mentions). G12: intake **implications/rework-risk** step. G13: Admin **Adoption/rollout** tab. Plus R12 polish: agent delay 600–1200ms → 220–480ms. | `chargepoint-cwb9hpeny-bansal-s-projects.vercel.app` | ✅ current |
| build-13 | Closed 4 gaps found on a full-transcript re-audit of Eric's feedback: (1) **multi-party document collaboration UX** — presence bar (contributors on the doc, "X viewing §Y") + Live-co-editing vs Locked-to-me toggle + our recommendation (§4, the hard piece; prototype fidelity); (2) **default review to V3** (attorney's working copy, not V2 — §2); (3) **chat-driven playbook restructuring** (group/nest/flatten via NL — §8); (4) **notify admin on suggest-to-playbook** (§7). | `chargepoint-6wptj66ke-bansal-s-projects.vercel.app` | |
| build-12 | Implemented ALL of Eric Batill's (GC) use-case-review feedback: document-centric review (doc + issue-by-issue directive in parallel, agent collapsed, playbook one-view); versioning/redline (accept-all → clean copy → send clean copy + word-level redline; renamed Pending Execution→Ready to Sign, added In Negotiation, "Send back to counterparty"); many-to-one ticket↔docs (Deal Overview + multi-doc execution together/individually); AI buttons → Playbook-only + ad-hoc; suggest-to-playbook admin queue; nested playbook (MSA Indemnification+children) + NL playbook creation; Templates/"Projects" area. New views: ReviewDirective/RedlineDocView/DealExecutionView/ProjectsView. Adversarial-review fixes folded in (intent shadowing, stale executionTicketId, suggestion apply). | `chargepoint-lgz3gzk8e-bansal-s-projects.vercel.app` | |
| build-11 | CIO demo (grounded in the Ironclad recording): ① **agentic NDA intake** — one prompt resolves the counterparty (CRM/web lookup) + infers jurisdiction/law/posture/purpose/SF, auto-fills requestor, asks only to confirm + add signer (rewritten IntakeFlow + intake store actions); ② **Leadership Overview dashboard** — leader KPIs, ball-in-court split, "needs attention", stage funnel, by-counterparty (analytics.leadershipMetrics); ③ **contracts list** — Ironclad-style all-records table, one click from dashboard (KPI deep-links + button), NOT on the nav rail. Adversarial-review fixes folded in (create_confirm reachability, intent shadowing, date consistency). | `chargepoint-dkqp6v06c-bansal-s-projects.vercel.app` | |
| build-10 | rail nav (Dashboard/Files/Playbook) opens full-width with the agent collapsed (one click away) via `canvas.solo`; agreement right rail collapses to a thin icon strip when no panel is open (frees the document real estate); "Ask AI" on a document selection routes into the right-hand AI Assistant (seeded + grounded answer) | `chargepoint-jgbn3iuqo-bansal-s-projects.vercel.app` | |
| build-9 | Slack landing screen (entry: simulated Slack DM → click notification → agent home); Agreements repository ("Files" rail item — folder tree by counterparty → agreement → versions); Ask-AI on document text selection (floating button → clause analysis); playbook tier classification + Residuals (red line) & Permitted Purpose (deferred) provisions + filter bar (Baseline/Fallback/Red line/Deferred); agreement right rail opens neither Comments nor AI by default (both one click away) | `chargepoint-5z2fheo3w-bansal-s-projects.vercel.app` | |
| build-8 | UX refinements: persistent left nav (Agent/Dashboard/Playbook, RBAC-gated); agent answers first then user clicks the artifact chip to open the pane (no auto-open); removed the Negotiation lifecycle stage; leaner StageTracker (no Lifecycle/ball-in-court header); Agreements pill only for multi-agreement tickets; right rail defaults to AI Assistant (Comments one click away); starter renames | `chargepoint-6r9h8lv2h-bansal-s-projects.vercel.app` | |
| build-7 | execution auto-resolves any open deviations to their recommended disposition, so the executed record + deal summary read cleanly | prior production deployment | |
| build-6 | redesigned Deal Summary + signed/executed document (viewable + downloadable, DocuSign completion certificate), filled commercial terms, computed negotiation summary, counterparty history | prior production deployment | |
| build-5 | visible lifecycle stage tracker + inline approval chain (advance Draft→…→Executed; grant/deny at the Sent-to-Counterparty gate) | prior production deployment | |
| build-4 | make-it-real: live Claude, real editor, e-sign, approvals/routing/SLA, computed analytics, version diff, RBAC row-scoping | `chargepoint-erwifon3u-bansal-s-projects.vercel.app` | |
| build-3 | role-based access control (greeting/starters/command-palette/agent-denial/row-scoping) | `chargepoint-lnjyzaj91-bansal-s-projects.vercel.app` | |
| build-2.x | agent-first redesign + balanced side-by-side + centered hero | `chargepoint-aqfmdtxon-…` / `…-fznzklfr3-…` / `…-e45fn2acz-…` | |
| build-1 | original agentic CLM app (all 14 screens) | `chargepoint-kppfemm5l-bansal-s-projects.vercel.app` | |

(Authoritative list any time: `vercel ls chargepoint-clm --scope bansal-s-projects`.)

## How to revert in one prompt
Just tell me, e.g.:
- **"revert to the previous build"** → I run `vercel rollback` to the deployment before the current one (instant).
- **"revert to build-3"** (or any build) → I `vercel rollback <that deployment url>` (instant), and `git reset --hard build-3` if it's in git.
- **"roll forward / redeploy latest"** → I rebuild from `main` and `vercel deploy --prod`.

Default behavior on a plain "revert": **instant Vercel rollback to the previous deployment** (safe, reversible — rolling forward again is one command).

## Going-forward convention
For every new build I make, I will: commit + tag (`build-N`) in git **and** deploy to Vercel, keeping the two in sync so either layer can restore any version.
