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
| **build-10** | rail nav (Dashboard/Files/Playbook) opens full-width with the agent collapsed (one click away) via `canvas.solo`; agreement right rail collapses to a thin icon strip when no panel is open (frees the document real estate); "Ask AI" on a document selection routes into the right-hand AI Assistant (seeded + grounded answer) | `chargepoint-jgbn3iuqo-bansal-s-projects.vercel.app` | ✅ current |
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
