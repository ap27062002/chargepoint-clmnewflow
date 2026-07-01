import { useStore, agreementDeviations } from '@/store'
import type { ChatMessage, ChatAction, ArtifactKind, Role } from '@/types'
import { userById } from '@/data/seed'
import { can, CAP_LABEL, ROLE_LABEL, ROLE_SCOPE, startersFor, type Capability } from '@/lib/access'
import { canSeeTicket } from '@/lib/scope'
import { lookupCounterparty, inferDealContext } from '@/data/counterparties'
import { precedentAnswer, precedentDigest, searchPrecedent } from '@/lib/precedent'
export { GREETING } from '@/agent/greeting'

let _c = 0
const cid = () => `chat-${Date.now()}-${_c++}`
const ts = () => new Date('2026-06-27T10:08:00').toISOString()

interface AgentReply {
  text: string
  artifact?: { kind: ArtifactKind; refId?: string; title?: string }
  actions?: ChatAction[]
  effect?: () => void
}

type Intent = { name: string; test: (t: string) => boolean; reply: (t: string) => AgentReply; cap?: Capability }

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w))

const currentRole = (): Role => {
  const s = useStore.getState()
  return s.users.find((u) => u.id === s.currentUserId)!.role
}

function denial(role: Role, cap: Capability): AgentReply {
  const starters = startersFor(role).slice(0, 2)
  return {
    text: `🔒 You don't have access to **${CAP_LABEL[cap]}**.\n\nYou're signed in as **${ROLE_LABEL[role]}**, so you can ${ROLE_SCOPE[role]}. That request is restricted to a different role.\n\nIf you're demoing access control, switch persona from the top-right avatar.`,
    artifact: { kind: 'none' },
    actions: starters.map((s, i) => ({ label: s.label, prompt: s.prompt, variant: i === 0 ? 'primary' as const : undefined })),
  }
}

// ---- intent handlers --------------------------------------------------------
const intents: Intent[] = [
  {
    // "Ask AI" on a highlighted clause in the document view.
    name: 'explain_clause', cap: 'review',
    test: (t) => has(t, 'explain this clause', 'flag any playbook risk', 'ask ai about this', 'what does this clause'),
    reply: (t) => {
      let body: string
      if (has(t, 'residual')) {
        body = `This is a **residuals** clause — a strict playbook **red line**. It would let the other side reuse anything their people "retain in memory," which guts trade-secret protection. **Recommendation: reject in full.** It's rejected in 100% of sampled deals and InfoSec treats it as a hard no.`
      } else if (has(t, 'survive', 'years from', 'expire', 'termination', 'term of')) {
        body = `This is a **term / survival** clause. Playbook baseline is a **2-year term with 5-year CI survival** (trade secrets indefinite). Approved fallbacks go to **3yr/3yr** then **3yr/2yr**. **Red line:** CI survival under 2 years, or trade-secret protection ending on expiry.`
      } else if (has(t, 'governing', 'jurisdiction', 'venue', 'delaware', 'arbitration')) {
        body = `This is a **governing law & venue** clause. Baseline is **Delaware law + Delaware courts**; approved fallbacks are counterparty home-state law (Delaware venue) or neutral New York. **Red line:** foreign governing law or ICC arbitration seated outside the U.S.`
      } else if (has(t, 'injunctive', 'irreparable', 'bond')) {
        body = `This is an **injunctive relief** clause. Baseline: mutual, no bond required. Approved fallback: leave the bond "as the court deems appropriate." **Red line:** relief available to the counterparty only, or a mandatory bond on ChargePoint.`
      } else if (has(t, 'indemnif', 'liability', 'damages', 'consequential')) {
        body = `This reads like an **indemnity / liability** term — generally **out of scope for an NDA** and one-sided when counterparties add it. **Recommendation: strike it** and keep remedies to injunctive relief, unless the deal team specifically wants it.`
      } else {
        body = `Mapped against the **NDA playbook**: I don't see a red-line trigger in this text. Confirm the defined terms ("Confidential Information", not "Proprietary") are used consistently and that any obligation is **mutual**. If you want, I can compare it to the matching playbook provision.`
      }
      return {
        text: `**Clause analysis** — for the text you highlighted:\n\n${body}`,
        artifact: { kind: 'none' },
        actions: [
          { label: 'Open the playbook', prompt: 'show me the NDA playbook' },
          { label: 'Review the full redline', prompt: 'review the Vishay redline' },
        ],
      }
    },
  },
  // ===== build-12: Eric's use-case feedback =====
  {
    name: 'send_back', cap: 'disposition',
    test: (t) => has(t, 'send back', 'send the clean copy', 'clean copy and redline', 'send our redline', 'send the redline back', 'send it back to the counterparty', 'return to counterparty'),
    reply: () => ({
      text: `Opening the **send-back** panel for the Vishay NDA. I'll assemble a **clean copy** (your working copy with changes accepted) plus a **redline vs their Draft 2** (non-cumulative), and can draft an internal or external **summary of the changes**. Nothing goes out until you send it — status then moves to **In Negotiation**.`,
      artifact: { kind: 'send_back', refId: 'AGR-2201', title: 'Vishay NDA — send back (clean copy + redline)' },
      actions: [],
    }),
  },
  {
    name: 'generate_redline', cap: 'disposition',
    test: (t) => has(t, 'generate the redline', 'generate a redline', 'produce a redline', 'redline document', 'clean copy plus redline'),
    reply: () => ({
      text: `Generating the **redline document** — your clean copy vs the counterparty's last version, word-level. Open it below; you can switch the comparison version or make it cumulative (e.g. V-latest vs V1), then send a clean copy + redline.`,
      artifact: { kind: 'redline_doc', refId: 'AGR-2201', title: 'Vishay NDA — redline document' },
      actions: [],
    }),
  },
  {
    name: 'summarize_changes', cap: 'disposition',
    test: (t) => (has(t, 'summarize the changes', 'summary of changes', 'summarize my changes', 'summarize our changes', 'change summary', 'draft a summary of the changes')) && !has(t, 'deal summary', 'mondelez'),
    reply: () => ({
      text: `I can draft a **summary of the changes** — an **internal** version (for a sales rep or contributor) or an **external** version (for the counterparty). Open the send-back panel below, generate the redline, and pick the audience.`,
      artifact: { kind: 'send_back', refId: 'AGR-2201', title: 'Vishay NDA — change summary' },
      actions: [],
    }),
  },
  {
    name: 'accept_all_clean', cap: 'disposition',
    test: (t) => (has(t, 'accept all', 'accept everything', 'make a clean copy', 'accept the changes')) && !has(t, 'recommended'),
    reply: () => ({
      text: `Accepted all tracked changes on the working copy — it's now a **clean copy**. Attorneys can't carry cumulative track-changes across versions; once accepted, the doc is clean and I redline it against the counterparty's version. Open it below, then assemble the clean copy + redline.`,
      artifact: { kind: 'document', refId: 'AGR-2201', title: 'Vishay NDA — clean copy' },
      effect: () => useStore.getState().acceptAllChanges('V-2201-2'),
      actions: [{ label: 'Assemble clean copy + redline', prompt: 'send the clean copy and redline back to the counterparty', variant: 'primary' }],
    }),
  },
  {
    name: 'execute_deal', cap: 'disposition',
    test: (t) => has(t, 'execute the deal', 'sign all', 'execute all', 'sign the deal', 'send all for signature', 'sign multiple', 'execute the northwind', 'sign the northwind'),
    reply: () => ({
      text: `Opening **deal execution** for Northwind — this ticket has multiple documents (MSA, DPA, SOW). Select which to sign and route them **all together** or **individually** (the SOW is ready to sign now; the MSA is still in redline). I can't sign — each DocuSign envelope is yours to advance.`,
      artifact: { kind: 'deal_execution', refId: 'TKT-1031', title: 'Northwind — execute & sign' },
      actions: [],
    }),
  },
  {
    name: 'deal_overview', cap: 'review',
    test: (t) => has(t, 'deal overview', 'documents on this ticket', 'all the documents', 'the whole deal', 'multiple documents', 'northwind deal', 'all agreements on', 'open the northwind'),
    reply: () => ({
      text: `Opening the **Northwind deal** — all three agreements (MSA, DPA, SOW) on one ticket, each with its stage and whose court it's in, plus deal-level discussion. Open any document, or execute the ones that are ready.`,
      artifact: { kind: 'ticket', refId: 'TKT-1031', title: 'Northwind Energy — deal' },
      actions: [{ label: 'Execute & sign', prompt: 'execute the northwind deal', variant: 'primary' }],
    }),
  },
  {
    name: 'suggest_to_playbook', cap: 'playbook_suggest',
    test: (t) => has(t, 'suggest') && has(t, 'playbook')
      && !has(t, 'review', 'suggestions', 'suggested addition', 'suggestion queue', 'creating a playbook', 'a playbook for', 'create a playbook'),
    reply: (t) => {
      const kind = has(t, 'red line', 'red-line', 'redline') ? 'red_line' as const : has(t, 'default', 'standard') ? 'default' as const : 'fallback' as const
      const m = t.match(/(?:add to playbook(?: as [a-z ]+)?:?|to the playbook:?)\s*(.{2,140})/i)
      const text = (m?.[1] || 'the highlighted clause language').trim()
      // Derive the target playbook + source from the agreement currently open (not hardcoded to Vishay/NDA).
      const st = useStore.getState()
      const ag = st.agreements.find((a) => a.id === st.canvas.agreementId)
      const pbId = ag?.playbook_id ?? 'pb_nda'
      const pbName = st.playbooks.find((p) => p.id === pbId)?.name ?? 'the playbook'
      return {
        text: `Sent to the **playbook owner** for approval — proposed as a **${kind.replace('_', ' ')}** for *${pbName}*. It lands in Playbook → **Suggested additions**; once approved it's added and the agent flags it automatically from then on.`,
        artifact: { kind: 'playbook_suggestions', title: 'Playbook — suggested additions' },
        effect: () => { const s = useStore.getState(); const a = s.agreements.find((x) => x.id === s.canvas.agreementId); s.suggestToPlaybook({ playbook_id: a?.playbook_id ?? 'pb_nda', provision_name: 'Suggested clause', kind, proposed_text: text, source_agreement_id: a?.id ?? 'AGR-2201' }) },
        actions: [{ label: 'Review the suggestion queue', prompt: 'review playbook suggestions', variant: 'primary' }],
      }
    },
  },
  {
    name: 'playbook_suggestions_view', cap: 'playbook_view',
    test: (t) => has(t, 'playbook suggestions', 'suggested additions', 'suggested changes to the playbook', 'review playbook', 'suggestion queue', 'new changes in playbook', 'review 2 new changes'),
    reply: () => ({
      text: `Opening the **Suggested additions** queue — clauses attorneys have proposed for the playbook, each with the source deal and rationale. As owner you can **approve** (adds it to the playbook) or **reject**.`,
      artifact: { kind: 'playbook_suggestions', title: 'Playbook — suggested additions' },
      actions: [],
    }),
  },
  {
    // Refine an in-progress playbook DRAFT in natural language (add/remove/re-tier provisions).
    // Guarded to only fire while a generated draft is open, so it never shadows create/restructure.
    name: 'refine_playbook_draft', cap: 'playbook_edit',
    test: (t) => {
      const s = useStore.getState()
      const d = s.playbookDrafts.find((x) => x.id === s.canvas.playbookDraftId) ?? s.playbookDrafts[0]
      return !!d && d.stage === 'generated' && (has(t, 'add a', 'add an', 'include a', 'remove the', 'delete the', 'drop the', 're-tier', 'retier') && has(t, 'provision', 'clause', 'red line', 'redline', 'fallback', 'baseline'))
    },
    reply: (t) => {
      const s = useStore.getState()
      const d = s.playbookDrafts.find((x) => x.id === s.canvas.playbookDraftId) ?? s.playbookDrafts[0]
      const confirm = s.refinePlaybookDraft(d.id, t)
      return {
        text: `${confirm}\n\nReview the updated provisions in the builder, then **Publish** when it's ready.`,
        artifact: { kind: 'playbook_create', title: 'Refine playbook draft' },
        actions: [{ label: 'Publish playbook', prompt: 'publish the playbook', variant: 'primary' }],
      }
    },
  },
  {
    name: 'create_playbook', cap: 'playbook_edit',
    test: (t) => has(t, 'create a playbook', 'create my playbook', 'new playbook', 'build a playbook', 'create playbook', 'make a playbook'),
    reply: (t) => {
      // R48/R49 — infer the agreement type + resolve the default source folder for it (no path needed).
      const type: 'MSA' | 'MNDA' = has(t, 'msa', 'master service', 'services agreement') ? 'MSA' : 'MNDA'
      const s = useStore.getState()
      const folder = s.playbookSourceDefaults[type]
      const exampleN = folder?.exampleAgreementIds.length ?? 0
      return {
        text: `Let's build a **${type === 'MSA' ? 'MSA' : 'NDA'} playbook**. I'll start from the default source folder **${folder?.path ?? '(none set)'}** — the ${type} template plus **${exampleN} example agreement${exampleN === 1 ? '' : 's'}** — analyze how each example resolved every section, and derive the provisions. You review, refine by chat, and publish. Open the builder below (adjust the folder/examples there).`,
        artifact: { kind: 'playbook_create', title: `Create a ${type === 'MSA' ? 'MSA' : 'NDA'} playbook` },
        effect: () => useStore.getState().startPlaybookDraft(`New ${type === 'MSA' ? 'MSA' : 'NDA'} Playbook`, type, `Create a ${type} playbook from ${folder?.path ?? 'the default folder'}`),
        actions: [],
      }
    },
  },
  {
    name: 'playbook_restructure', cap: 'playbook_edit',
    test: (t) => has(t, 'restructure the playbook', 'reorganize the playbook', 'reformat the playbook', 'nest the', 'nest indemnif'),
    reply: () => ({
      text: `You can restructure the playbook in natural language — group provisions, **nest child concepts under a parent** (e.g. Indemnification → scope / exclusions / limitations / notice / control-of-defense), or reformat for a different audience. The MSA playbook already shows nesting. The backend keeps using the same positions to detect deviations regardless of how it's rendered.`,
      artifact: { kind: 'playbook', refId: 'pb_msa', title: 'MSA playbook (nested)' },
      effect: () => useStore.getState().setPlaybook('pb_msa'),
      actions: [{ label: 'Open the MSA playbook', prompt: 'show me the MSA playbook', variant: 'primary' }],
    }),
  },
  {
    name: 'create_template_project', cap: 'templates',
    test: (t) => has(t, 'create a template', 'new template', 'build a template', 'build a new template', 'create a new template', 'template project'),
    reply: () => ({
      text: `Opening **Projects** to build a new form template. Point me at **precedent** ChargePoint agreements + **third-party standards**, and I'll generate a template modeled on the standards but carrying our concepts — you iterate with me, save it to the library, and can build a playbook from it. Your Claude Projects flow, made enterprise.`,
      artifact: { kind: 'projects', title: 'Template projects' },
      actions: [],
    }),
  },
  {
    name: 'templates_folder', cap: 'templates',
    test: (t) => has(t, 'template projects', 'open projects', 'templates folder', 'projects workspace', 'my templates', 'template library', 'open the projects'),
    reply: () => ({
      text: `Opening **Projects** — your template-building workspace and the library of saved templates (the NDA and MSA templates that seed the playbooks). Start a new project to build a form agreement from precedent.`,
      artifact: { kind: 'projects', title: 'Template projects' },
      actions: [],
    }),
  },
  {
    name: 'tagged',
    test: (t) => has(t, 'tagged', 'assigned to me', 'my plate', "what's on me", 'waiting on me', 'sign-off', 'sign off'),
    reply: () => {
      const s = useStore.getState()
      const uid = s.currentUserId
      const role = s.users.find((u) => u.id === uid)!.role
      const first = userById(uid)?.name.split(' ')[0]
      const mentions = s.messages.filter((m) => m.mentions?.includes(uid) && !m.resolved)
      const myTickets = s.tickets.filter((t) => t.assigned_attorney_id === uid && t.status !== 'Executed' && t.status !== 'Resolved')
      const agTitle = (id?: string | null) => s.agreements.find((a) => a.id === id)?.title ?? 'a deal'
      const onVishay = mentions.some((m) => m.agreement_id === 'AGR-2201')
      const mentionLines = mentions.slice(0, 4).map((m) => `• **${agTitle(m.agreement_id)}**${m.provision_reference ? ` — ${m.provision_reference}` : ''}: “${m.body.length > 90 ? m.body.slice(0, 90) + '…' : m.body}” _(from ${userById(m.author_id)?.name.split(' ')[0]})_`).join('\n')

      // Contributors (InfoSec, Finance, …) don't own tickets — their plate is the sign-off requests they're tagged on.
      if (role === 'contributor' || (mentions.length > 0 && myTickets.length === 0)) {
        return {
          text: mentions.length
            ? `Here's what's waiting on you, ${first}. You've been tagged for **sign-off on ${mentions.length} provision${mentions.length === 1 ? '' : 's'}**:\n\n${mentionLines}\n\nOpen the document to weigh in, then the attorney can mark your sign-off received.`
            : `Nothing is waiting on your sign-off right now, ${first}. When an attorney @-tags you on a provision, it'll show up here with a one-click link to the clause.`,
          artifact: { kind: 'tagged_items', title: 'My sign-off requests' },
          actions: mentions.length
            ? [onVishay ? { label: 'Open the flagged document', prompt: 'review the Vishay redline', variant: 'primary' as const } : { label: 'Show the dashboard', prompt: 'show me the dashboard', variant: 'primary' as const }]
            : [{ label: 'Show the dashboard', prompt: 'show me the dashboard', variant: 'primary' as const }],
        }
      }
      // Attorneys / owners: assigned tickets + the provisions others have asked them to weigh in on.
      return {
        text: `Here's everything currently on your plate, ${first}.\n\n**${mentions.length} provision sign-off${mentions.length === 1 ? '' : 's'} awaiting you** and **${myTickets.length} active ticket${myTickets.length === 1 ? '' : 's'}** assigned to you.${mentions.length ? `\n\n${mentionLines}` : ''}\n\nThe Airbus NDA (TKT-1039) is at **80% of its SLA window** — I'd take that first.`,
        artifact: { kind: 'tagged_items', title: 'My queue & tagged items' },
        actions: [
          { label: 'Open Airbus (SLA risk)', prompt: 'open ticket TKT-1039', variant: 'primary' },
          { label: 'Review Vishay redline', prompt: 'review the Vishay redline' },
        ],
      }
    },
  },
  {
    name: 'review_redline', cap: 'review',
    test: (t) => has(t, 'redline', 'red line', 'review the', 'analyz', 'deviation', 'vishay', 'walk me through')
      && !has(t, 'signature', 'sign', 'execute', 'docusign', 'summary', 'summarize'),
    reply: () => {
      const s = useStore.getState()
      const devs = agreementDeviations(s, 'AGR-2201')
      const open = devs.filter((d) => d.disposition_status === 'open').length
      const red = devs.filter((d) => d.risk_category === 'red_line').length
      const neg = devs.filter((d) => d.risk_category === 'negotiate').length
      const acc = devs.filter((d) => d.risk_category === 'accept').length
      const qa = devs.length - red - neg - acc
      // Lead issue is DERIVED from the computed set (highest-risk open item), not hardcoded.
      const rank: Record<string, number> = { red_line: 0, negotiate: 1, missing: 2, enhancement: 3, new: 4, accept: 5 }
      const top = [...devs].sort((a, b) => (rank[a.risk_category] ?? 9) - (rank[b.risk_category] ?? 9))[0]
      const lead = top ? `The one that matters most: **${top.provision_name} (${top.section_reference})** — ${top.recommended_response}` : 'No deviations detected.'
      return {
        text: `I diffed **Vishay's Draft 2** against the prior version, mapped each change to the NDA playbook, and classified it. That analysis produced **${devs.length} issues** — ${red} red line, ${neg} negotiate, ${acc} accept${qa > 0 ? `, ${qa} QA flag${qa === 1 ? '' : 's'}` : ''}.\n\n${lead}\n\n${open} are still open. **Open the Issues View** (below, sorted by risk) to step through them — Apply / Skip / Reject each, or I can apply all recommended dispositions.`,
        artifact: { kind: 'redline_review', refId: 'AGR-2201', title: 'Open the Issues View — Vishay redline' },
        actions: [
          { label: 'Apply all recommended', prompt: 'apply all recommended dispositions to Vishay', variant: 'primary' },
          { label: 'Why is residuals a red line?', prompt: 'why is the residuals clause a red line?' },
          { label: 'Draft our response', prompt: 'generate our redline response for Vishay' },
        ],
      }
    },
  },
  {
    name: 'residuals_explain', cap: 'review',
    test: (t) => has(t, 'residual') && has(t, 'why', 'red line', 'explain', 'exposure', 'guidance'),
    reply: () => {
      // Precedent line is COMPUTED from the real corpus (R44) — no fabricated deals.
      const prec = searchPrecedent('residuals')
      const precLine = prec.length
        ? prec.map((p) => `${p.counterparty} (${p.section}, ${p.disposition})`).join('; ')
        : 'no executed ChargePoint agreement contains a residuals clause — there is no accepted precedent for it (Vishay §1(f) is the only introduction, and it is live).'
      return {
      text: `**Residuals — playbook red line (do not accept).**\n\nA residuals clause lets the other side freely use anything their people "retain in unaided memory" — ideas, know-how, techniques — for any purpose. In practice it **guts trade-secret protection**: an engineer who saw our battery-evaluation data could reuse it and argue it was just "in their memory."\n\n- **Playbook position:** §4 exclusions are the five standard ones only. Residuals is listed as a strict red line.\n- **Precedent:** ${precLine}\n- **InfoSec (Priya Anand):** has separately flagged it as a hard no on this deal.\n\n**Recommendation:** reject §1(f) in full in our response. I've marked it accordingly in the Issues View.`,
      artifact: { kind: 'redline_review', refId: 'AGR-2201', title: 'Vishay NDA — Residuals (§1(f))' },
      actions: [
        { label: 'Reject §1(f) residuals', prompt: 'reject the residuals deviation', variant: 'primary' },
        { label: 'Show the playbook clause', prompt: 'show me the NDA playbook' },
      ],
      }
    },
  },
  {
    // R44 — chat against executed precedent. Answer is COMPUTED from the real corpus (no fabrication).
    name: 'precedent_lookup', cap: 'review',
    test: (t) => has(t, 'precedent', 'have we done', 'has this been done', 'what did we do on', 'prior deal', 'previously executed', 'on the mondelez', 'on the clever', 'accepted before', 'ever accepted', 'ever rejected', "what's our history"),
    reply: (t) => ({
      text: precedentAnswer(t) + `\n\n_Grounded in ChargePoint's executed-agreement corpus. Open the contracts list to verify any citation._`,
      artifact: { kind: 'contracts', title: 'Executed precedent' },
      actions: [{ label: 'Open executed contracts', prompt: 'show me all contracts', variant: 'primary' }],
    }),
  },
  {
    name: 'apply_all', cap: 'disposition',
    test: (t) => has(t, 'apply all', 'accept all recommended', 'apply recommended', 'apply all recommended'),
    reply: () => ({
      text: `Done — I applied the **recommended disposition** to every open deviation on the Vishay NDA: accepts confirmed, the red lines (residuals) rejected, and the rest set to counter at the approved fallback. Nothing was sent anywhere — these are internal dispositions for your review.\n\nYou can still override any single item in the Issues View. When you're ready, I can generate our **clean + redline response** for your approval.`,
      artifact: { kind: 'redline_review', refId: 'AGR-2201', title: 'Vishay NDA — dispositions applied' },
      effect: () => useStore.getState().applyAllRecommended('AGR-2201'),
      actions: [
        { label: 'Generate our response', prompt: 'generate our redline response for Vishay', variant: 'primary' },
        { label: 'Open the document', prompt: 'open the vishay document' },
      ],
    }),
  },
  {
    name: 'reject_residual', cap: 'disposition',
    test: (t) => has(t, 'reject') && has(t, 'residual'),
    reply: () => ({
      text: `Rejected **§1(f) Residuals**. It's marked *rejected* in the Issues View and will be struck in our response, with a short note citing our standard position. InfoSec's concurrence is logged on the thread.`,
      artifact: { kind: 'redline_review', refId: 'AGR-2201', title: 'Vishay NDA — residuals rejected' },
      effect: () => useStore.getState().setDisposition('D-02', 'rejected'),
      actions: [{ label: 'Generate our response', prompt: 'generate our redline response for Vishay', variant: 'primary' }],
    }),
  },
  {
    name: 'generate_response', cap: 'disposition',
    test: (t) => has(t, 'generate', 'draft our', 'our response', 'redline response', 'counter', 'clean copy', 'clean and redline')
      && !has(t, 'use defaults', 'create an nda', 'new nda', 'create a new nda'),
    reply: () => ({
      text: `I've prepared **ChargePoint's response (V3)** to Vishay based on your dispositions:\n\n- **Removed** §1(f) Residuals (red line).\n- **Countered** Term to **3 years / 3-year CI survival** (Fallback 1); trade-secret carve-out preserved.\n- **Countered** Injunctive Relief — kept mutual, bond "as the court deems appropriate."\n- **Qualified** Affiliate liability to Affiliates receiving Confidential Information.\n- **Corrected** the defined-term inconsistency ("Proprietary" → "Confidential Information") throughout.\n- **Accepted** the legal-hold copy and oral-disclosure window.\n\nOutput is ready as a **clean copy** and a **redline** vs. their Draft 2. Internal CLM comments are kept out of the delivered file.\n\n⚠️ I can't send this externally — that needs your approval and goes out under your signature.`,
      artifact: { kind: 'agreement', refId: 'AGR-2201', title: 'Vishay NDA — V3 (CP response)' },
      actions: [
        { label: 'Approve & prepare to send', prompt: 'send the Vishay response to the counterparty', variant: 'primary' },
        { label: 'Open document view', prompt: 'open the vishay document' },
      ],
    }),
  },
  {
    name: 'send_external', cap: 'disposition',
    test: (t) => has(t, 'send') && has(t, 'counterparty', 'vishay', 'external', 'airbus', 'them'),
    reply: () => ({
      text: `Prepared the outbound package and a draft cover email to Vishay's counsel — **but I won't send it myself.** Per policy, the AI cannot deliver documents externally or execute signatures; external delivery is an **attorney-approved** action sent from your account.\n\n**Ready for your approval:**\n- ✅ Clean V3 (internal comments stripped)\n- ✅ Redline vs Draft 2\n- ✅ Draft cover note summarizing our three counters\n\nApprove below and I'll stage it in Outlook for you to send; the ticket will move to **Sent to Counterparty** and the ball flips to their court.`,
      artifact: { kind: 'agreement', refId: 'AGR-2201', title: 'Vishay NDA — ready to send' },
      actions: [
        { label: 'Approve external delivery', prompt: 'approve and stage the Vishay delivery in Outlook', variant: 'primary' },
        { label: 'Edit the cover note', prompt: 'edit the cover note' },
      ],
    }),
  },
  {
    name: 'approve_send', cap: 'disposition',
    test: (t) => has(t, 'approve') && has(t, 'send', 'deliver', 'outlook', 'stage', 'delivery'),
    reply: () => {
      return {
        text: `Approved and staged in Outlook under your account. ✅\n\n- Ticket **TKT-1042 → Sent to Counterparty**\n- Ball in court → **Counterparty**\n- Audit events logged (\`document_sent\`), notification sent to Marcus Reed.\n\nI'll watch for their response and run redline analysis automatically when it lands.`,
        artifact: { kind: 'dashboard', title: 'Pipeline updated' },
        effect: () => {
          const st = useStore.getState()
          useStore.setState({
            tickets: st.tickets.map((t) => (t.id === 'TKT-1042' ? { ...t, status: 'Sent to Counterparty' } : t)),
            agreements: st.agreements.map((a) => (a.id === 'AGR-2201' ? { ...a, status: 'sent_to_counterparty', ball_in_court: 'counterparty' } : a)),
          })
          st.audit_push({ event_type: 'document_sent', ticket_id: 'TKT-1042', agreement_id: 'AGR-2201', actor_id: st.currentUserId, summary: 'V3 sent to Vishay Intertechnology (attorney-approved).' })
          st.audit_push({ event_type: 'status_changed', ticket_id: 'TKT-1042', summary: 'TKT-1042 → Sent to Counterparty.' })
        },
        actions: [
          { label: 'Route for e-signature', prompt: 'route the Vishay NDA for signature', variant: 'primary' },
          { label: 'Back to dashboard', prompt: 'show me the dashboard' },
        ],
      }
    },
  },
  {
    name: 'lifecycle', cap: 'review',
    test: (t) => has(t, 'lifecycle', 'what stage', 'which stage', 'stage of', 'approval chain', 'approvals', 'how does it move', 'how will it move', 'next step', 'move from redlin', 'how an agreement'),
    reply: () => ({
      text: `Each agreement moves through this lifecycle:\n\n**Draft → Internal Review → Sent to Counterparty → Redline Received → In Negotiation → Ready to Sign → Executed**\n\nSending the counterparty our redline puts the ball back in their court (In Negotiation); when terms are final it moves to **Ready to Sign** and executes through DocuSign. Open the Vishay NDA below — the **lifecycle bar at the top** shows the current stage, the "Advance" / "Send back to counterparty" action, and any pending approvals inline.`,
      artifact: { kind: 'redline_review', refId: 'AGR-2201', title: 'Vishay NDA — lifecycle & approvals' },
      actions: [{ label: 'Advance to the next stage', prompt: 'advance the Vishay NDA to the next stage', variant: 'primary' }],
    }),
  },
  {
    name: 'advance_stage', cap: 'disposition',
    test: (t) => has(t, 'advance', 'next stage', 'move it forward', 'move forward', 'progress the', 'move to next', 'send to internal', 'internal review'),
    reply: () => ({
      text: `Advancing the **Vishay NDA** to its next stage. If the next step is **Sent to Counterparty**, I route it through the **approval chain** first — it appears in the lifecycle bar with Grant/Deny, and I can't deliver externally until it's approved.`,
      artifact: { kind: 'redline_review', refId: 'AGR-2201', title: 'Vishay NDA — lifecycle' },
      effect: () => useStore.getState().advanceAgreementStage('AGR-2201'),
      actions: [{ label: 'Route for e-signature', prompt: 'route the Vishay NDA for signature' }],
    }),
  },
  {
    name: 'execute', cap: 'disposition',
    test: (t) => has(t, 'execute', 'docusign', 'signature', 'send for signature', 'route for signature', 'e-sign', 'esign', 'for signing'),
    reply: () => ({
      text: `The **execution flow** for the Vishay NDA is ready. It runs the **approval chain** → **DocuSign envelope** (ChargePoint signer, then counterparty) → **archive** → status **Executed** → an auto-generated **deal summary**. I can't sign — each step is yours to advance. Open it below.`,
      artifact: { kind: 'execution', refId: 'AGR-2201', title: 'Vishay NDA — execution & e-sign' },
      actions: [],
    }),
  },
  {
    name: 'create_nda', cap: 'intake',
    test: (t) => (has(t, 'create', 'draft', 'start', 'new') && has(t, 'nda', 'agreement', 'mutual'))
      && !has(t, 'response', 'redline', 'review the', 'use defaults'),
    reply: (t) => {
      // Parse the counterparty from a single natural-language prompt, e.g.
      // "create an NDA using the ChargePoint template for UnifyApps".
      const m = t.match(/(?:for|with)\s+(.+)$/i)
      const query = (m?.[1] ?? '')
        .replace(/\b(using|from|on the|on)\b.*$/i, '')
        .replace(/\b(the\s+)?chargepoint\b/gi, '').replace(/\btemplate\b/gi, '')
        .replace(/['".]+$/, '').trim()
      const behalf = t.match(/on behalf of\s+([a-z][a-z .'-]{1,30})/i)?.[1]?.trim()
      if (!query) {
        return {
          text: `Happy to draft an NDA. **Who's the counterparty?** Give me a name or website — e.g. *"create an NDA using the ChargePoint template for UnifyApps"* — and I'll resolve the entity, address, jurisdiction and likely posture from CRM and the web, then pre-fill the brief. You only confirm and add the signer.`,
          artifact: { kind: 'none' },
          actions: [
            { label: 'NDA for UnifyApps', prompt: 'create an NDA using the ChargePoint template for UnifyApps', variant: 'primary' },
            { label: 'NDA for Google', prompt: 'create an NDA for Google' },
          ],
        }
      }
      const profile = lookupCounterparty(query)[0]
      const ctx = profile ? inferDealContext(profile) : null
      const cp = profile?.legal_name ?? query
      const known = !!profile && !profile.address.toLowerCase().includes('pending')
      const lines = profile ? [
        `- **Counterparty:** ${profile.legal_name} · ${profile.website} · ${profile.hq_city}, ${profile.hq_country}${known ? '' : '  _(unverified — confirm in the brief)_'}`,
        `- **Template:** ChargePoint Mutual NDA 2025 · **law:** ${ctx?.governingLaw}${profile.hq_country !== 'USA' && profile.hq_country !== '—' ? ' _(foreign-counterparty note applied)_' : ''}`,
        `- **Posture:** ${ctx?.clausePosture}`,
        profile.sf_opportunity ? `- **Salesforce:** ${profile.sf_opportunity} (auto-linked)` : `- **Salesforce:** no opportunity linked (optional)`,
      ].join('\n') : ''
      return {
        text: `On it. Drafting a **Mutual NDA** on the **ChargePoint template** for **${cp}**${behalf ? `, filed on behalf of **${behalf}**` : ''}.\n\nHere's what I inferred — all editable:\n${lines}\n\nRequestor is auto-filled from your login. **Open the drafting brief** to confirm the counterparty and add the signer — everything else is done.`,
        artifact: { kind: 'intake_form', refId: cp, title: `Open the drafting brief — ${cp}` },
        effect: () => useStore.getState().prepareIntake({ query, rawPrompt: t, onBehalfOf: behalf }),
        actions: [
          { label: 'Use defaults & generate', prompt: `use defaults and generate the NDA for ${cp}`, variant: 'primary' },
          { label: 'Different counterparty', prompt: 'create a new NDA' },
        ],
      }
    },
  },
  {
    name: 'create_confirm', cap: 'intake',
    test: (t) => has(t, 'use defaults') && has(t, 'generate', 'nda'),
    reply: (t) => ({
      text: `Done. ✅ Generated **V1** from the ChargePoint Mutual NDA 2025 template, populated the parties and registered address, ran a key-field QA pass, and created the ticket — routed to the matched attorney. Opening it now; review whenever you're ready.`,
      artifact: { kind: 'ticket_created', title: 'NDA created' },
      effect: () => {
        const st = useStore.getState()
        let p = st.canvas.intakePayload
        if (!p || !p.profile) {
          const m = t.match(/for\s+(.+)$/i)
          const query = (m?.[1] ?? '').replace(/\b(using|from|on)\b.*$/i, '').replace(/\btemplate\b/gi, '').trim()
          if (query) { st.prepareIntake({ query, rawPrompt: t }); p = useStore.getState().canvas.intakePayload }
        }
        if (p?.profile) {
          st.confirmCounterparty(p.profile)
          const ticket = st.generateNdaFromIntake()
          if (ticket) setTimeout(() => useStore.getState().openTicket(ticket.id), 60)
        } else {
          st.setToast('Tell me the counterparty first — e.g. "create an NDA for UnifyApps".')
        }
      },
      actions: [
        { label: 'Show the dashboard', prompt: 'show me the dashboard', variant: 'primary' },
        { label: 'Create another', prompt: 'create a new NDA' },
      ],
    }),
  },
  {
    name: 'contracts_list', cap: 'pipeline',
    test: (t) => has(t, 'all contract', 'all the contract', 'list of contract', 'list of agreement', 'contracts list', 'every contract', 'all records', 'all deals', 'all my contract', 'show me all contract'),
    reply: () => ({
      text: `Here's the **full contracts list** — every agreement with its stage, whose court it's in and how long it's been waiting, the ChargePoint owner, and the agreement date. Open it below; you can search and filter by stage, turn, or counterparty.`,
      artifact: { kind: 'contracts', title: 'All contracts' },
      actions: [{ label: 'Show the dashboard', prompt: 'show me the dashboard' }],
    }),
  },
  {
    name: 'playbook', cap: 'playbook_view',
    test: (t) => has(t, 'playbook') && !has(t, 'flag', 'no playbook', 'future playbook', 'guidance'),
    reply: (t) => {
      if (has(t, 'msa', 'master services', 'indemnif', 'nesting', 'nested')) {
        return {
          text: `The **ChargePoint MSA 2025** playbook — a complex contract, so it uses **nested provisions**: e.g. **Indemnification** is a parent with children (Scope, Exclusions, Limitations, Notification, Control of Defense), and **Limitation of Liability** is a mutual-cap red line. Open it below; expand a parent to see its sub-provisions.`,
          artifact: { kind: 'playbook', refId: 'pb_msa', title: 'MSA Playbook (nested)' },
          effect: () => useStore.getState().setPlaybook('pb_msa'),
          actions: [{ label: 'Review playbook suggestions', prompt: 'review playbook suggestions' }],
        }
      }
      if (has(t, 'add', 'residual', 'new provision', 'fallback', 'edit')) {
        return {
          text: `I can extend the **NDA playbook** in natural language. You mentioned **residuals** — right now it lives only as a strict *red line* under §4 Exclusions. I can add it as a **named provision** with its own positions so the system flags it consistently.\n\nProposed entry:\n- **Standard position:** No residuals clause.\n- **Fallback 1:** *(none — not negotiable)*\n- **Red line:** Any clause permitting use of information retained in memory.\n- **Rationale:** Erodes trade-secret protection; rejected in 100% of sampled deals.\n\nPlaybook changes require **Playbook Owner** approval (Eric Batill). Want me to draft this as a change request for his sign-off?`,
          artifact: { kind: 'playbook', title: 'NDA playbook — add provision' },
          actions: [
            { label: 'Draft change request for Eric', prompt: 'draft the playbook change request', variant: 'primary' },
            { label: 'Open the playbook', prompt: 'show me the NDA playbook' },
          ],
        }
      }
      return {
        text: `The **ChargePoint Mutual NDA 2025 (North America)** playbook — v3, owned by Eric Batill, generated from 11 executed NDAs plus Clever Devices and Mondelez.\n\nIt has **8 provisions** with baseline positions, approved fallback tiers, and strict red lines. The most-negotiated are **Term & Termination (41% of deals)** and **Governing Law (33%)**. Open it below — each provision shows its negotiation rate and rationale.`,
        artifact: { kind: 'playbook', title: 'NDA Negotiation Playbook' },
        actions: [
          { label: 'Most-negotiated provisions', prompt: 'which provisions are most negotiated?' },
          { label: 'Add a residuals provision', prompt: 'add a residuals provision to the playbook' },
        ],
      }
    },
  },
  {
    name: 'deal_summary', cap: 'deal_summary',
    test: (t) => has(t, 'summary', 'summarize', 'lessons', 'mondelez') && !has(t, 'change'),
    reply: () => ({
      text: `Here's the **deal summary** for the executed **Mondelez Mutual NDA** (closed 2026-05-19, signed via DocuSign):\n\n- **Counterparty:** Mondelez International · **Type:** Mutual NDA · **Paper:** CP\n- **Key terms:** 2-yr term, 5-yr CI survival, Delaware law.\n- **Concessions:** accepted marking grace period (Fallback 1); legal-hold copy retention.\n- **Improvements vs. their first draft:** removed unilateral indemnity; restored mutual injunctive relief.\n- **Lessons learned:** counterparty consistently pushes marking requirements → already an approved fallback, so cycle time was fast (17 days).\n\nStored permanently and feeding the weekly playbook-refinement loop.`,
      artifact: { kind: 'deal_summary', refId: 'AGR-2150', title: 'Mondelez NDA — Deal summary' },
      actions: [{ label: 'See refinement insights', prompt: 'what is the refinement loop recommending?' }],
    }),
  },
  {
    name: 'refinement', cap: 'playbook_view',
    test: (t) => has(t, 'refinement', 'refine', 'most negotiated', 'analytics', 'acceptance rate', 'concession'),
    reply: () => ({
      text: `From the **weekly refinement analysis** across executed NDAs:\n\n- **Marking / Identification** — negotiated in 27%; both fallbacks now widely accepted → **recommend: keep, monitor.**\n- **Term & Termination** — negotiated in 41%, almost always landing at 3yr/3yr → **recommend: add 3yr/3yr as an approved Fallback 1** (already drafted).\n- **Residuals** — counterparties introduced it in 3 recent deals, rejected each time → **recommend: promote to a named red-line provision** for consistent flagging.\n- **Governing Law** — 33% negotiated; neutral-NY fallback trending up.\n\nAll recommendations route to **Eric Batill** for approval before changing the playbook.`,
      artifact: { kind: 'playbook', title: 'Refinement recommendations' },
      actions: [{ label: 'Open the playbook', prompt: 'show me the NDA playbook', variant: 'primary' }],
    }),
  },
  {
    name: 'no_playbook_guidance', cap: 'review',
    test: (t) => (has(t, 'guidance') && has(t, 'no playbook', 'manual')) || has(t, 'suggest creating a playbook', 'suggest a playbook'),
    reply: () => ({
      text: `For agreements without a playbook (the Northwind **MSA / DPA / SOW**), I don't auto-classify — these stay attorney-led. I can still:\n\n- **Guide clause-by-clause**, grounded in our prior MSA/DPA deals and market standard.\n- **Flag unusual terms** — liability caps, IP assignment, data-processing roles — for your attention.\n- **Draft fallback language** on request.\n\nOnce a deal in a new category executes, I can **propose a playbook from it** (the baseline you accepted + the fallbacks you landed on) for the Playbook Owner to approve.`,
      artifact: { kind: 'none' },
      actions: [
        { label: 'Flag MSA for a future playbook', prompt: 'flag the northwind MSA for a future playbook', variant: 'primary' },
        { label: 'Open the NDA playbook', prompt: 'show me the NDA playbook' },
      ],
    }),
  },
  {
    name: 'flag_playbook', cap: 'review',
    test: (t) => has(t, 'flag') && has(t, 'playbook'),
    reply: () => ({
      text: `Flagged. I'll watch the **Northwind MSA** through execution and, once signed, draft a candidate MSA playbook from the final terms for the Playbook Owner (Eric Batill) to review. You'll get a notification when it's ready.`,
      artifact: { kind: 'none' },
      effect: () => useStore.getState().setToast('Northwind MSA flagged for playbook creation after execution.'),
      actions: [{ label: "What's on my plate?", prompt: "what's on my plate?", variant: 'primary' }],
    }),
  },
  {
    name: 'admin', cap: 'admin',
    test: (t) => has(t, 'admin', 'configure', 'routing', 'integration', 'sla config', 'manage user'),
    reply: () => ({
      text: `The **Admin Console** is ready — open it below. From here you configure assignment **routing**, **SLA** targets, **approval** chains, **notification** channels, **users & RBAC**, and **integrations** (Entra, DocuSign, SharePoint, Salesforce, LLMs). Changes are audited.`,
      artifact: { kind: 'admin', title: 'Admin console' },
      actions: [{ label: 'Review the audit log', prompt: 'show me the audit log', variant: 'primary' }],
    }),
  },
  {
    name: 'audit', cap: 'audit',
    test: (t) => has(t, 'audit', 'event history', 'event log', 'who changed', 'tamper'),
    reply: () => ({
      text: `The **Audit Center** — every action is an immutable, hash-chained event (7-year retention, regional residency). Open it below to filter by event type and see whether the actor was a person or the CLM agent.`,
      artifact: { kind: 'audit', title: 'Audit center' },
    }),
  },
  {
    name: 'dashboard', cap: 'pipeline',
    test: (t) => has(t, 'dashboard', 'overview', 'pipeline', 'status', 'where are we', "what's going on", 'home'),
    reply: () => {
      const s = useStore.getState()
      const active = s.tickets.filter((t) => t.status !== 'Executed' && t.status !== 'Resolved').length
      return {
        text: `Here's the legal pipeline. **${active} active matters**, ${s.tickets.filter((t) => t.status === 'Executed').length} recently executed. One SLA alert: **Airbus (TKT-1039)** at 80%. Vishay's redline is analyzed and waiting on your dispositions. Open the dashboard below.`,
        artifact: { kind: 'dashboard', title: 'Legal CLM dashboard' },
        actions: [
          { label: 'Review Vishay redline', prompt: 'review the Vishay redline', variant: 'primary' },
          { label: "What's on my plate?", prompt: "what's on my plate?" },
        ],
      }
    },
  },
  {
    name: 'repository', cap: 'review',
    test: (t) => has(t, 'all agreements', 'all the agreements', 'all versions', 'repository', 'document library', 'all my agreements', 'every agreement', 'agreement folder', 'version history of all'),
    reply: () => ({
      text: `The **Agreements repository** organizes every matter by counterparty, with the full version history (V1 → executed) under each agreement. Open it below to browse the folders or jump straight into any version's document.`,
      artifact: { kind: 'repository', title: 'Agreements repository' },
      actions: [],
    }),
  },
  {
    name: 'open_ticket', cap: 'review',
    test: (t) => /tkt-?\d{3,}/i.test(t) || has(t, 'open ticket', 'open airbus', 'open vishay', 'open northwind'),
    reply: (t) => {
      const m = t.match(/tkt-?(\d{3,})/i)
      let id = m ? `TKT-${m[1]}` : ''
      if (!id) {
        if (has(t, 'airbus')) id = 'TKT-1039'
        else if (has(t, 'vishay')) id = 'TKT-1042'
        else if (has(t, 'northwind')) id = 'TKT-1031'
      }
      const st = useStore.getState()
      const t2 = st.tickets.find((x) => x.id === id)
      if (!t2) return { text: `I couldn't find that ticket. Want the dashboard?`, actions: [{ label: 'Dashboard', prompt: 'show me the dashboard' }] }
      const me = st.users.find((u) => u.id === st.currentUserId)!
      if (!canSeeTicket(st.tickets, st.messages, me, id)) {
        return { text: `🔒 **${id}** isn't in your scope. As ${ROLE_LABEL[me.role]}, you can only access matters you ${me.role === 'initiator' ? 'created' : me.role === 'contributor' ? 'are tagged on' : 'are assigned to'}.`, artifact: { kind: 'none' }, actions: [{ label: "What's on my plate?", prompt: "what's on my plate?", variant: 'primary' }] }
      }
      return {
        text: `**${t2.title}** (${id}) — a ${t2.type.replace('_', ' ')} at **${t2.status}**, assigned to ${userById(t2.assigned_attorney_id || '')?.name}. Open the workspace below — Deal Discussion and Agreement Review.`,
        artifact: { kind: 'ticket', refId: id, title: t2.title },
        actions: [{ label: 'Review the agreement', prompt: `review the ${t2.counterparty_name} redline`, variant: 'primary' }],
      }
    },
  },
  {
    name: 'open_doc', cap: 'review',
    test: (t) => has(t, 'open the', 'document', 'show the doc', 'word', 'view the document'),
    reply: () => ({
      text: `The **document view** for the Vishay NDA is ready. Tracked changes show insertions and deletions with party attribution — counterparty edits are in blue, ours in green. Open it below; click any clause with an issue badge to jump to its analysis.`,
      artifact: { kind: 'document', refId: 'AGR-2201', title: 'Vishay NDA — document view' },
      actions: [{ label: 'Back to issues', prompt: 'review the Vishay redline' }],
    }),
  },
  {
    name: 'help',
    test: (t) => has(t, 'help', 'what can you', 'capabilities', 'who are you', 'hi', 'hello', 'hey'),
    reply: () => ({
      text: `I'm the **CLM Agent** — I run ChargePoint's contract lifecycle end to end, and you stay the decision-maker. I can:\n\n- **Intake & draft** — "create a new NDA for Vishay"\n- **Analyze redlines** against the playbook — "review the Vishay redline"\n- **Walk dispositions** — accept / negotiate / red-line each deviation, or apply all recommended\n- **Draft your response** — clean + redline, internal comments stripped\n- **Manage the playbook** in natural language — "add a residuals provision"\n- **Answer status questions** — "what's on my plate?", "summarize the Mondelez deal"\n\nI never approve terms, send externally, or sign — those are yours. What would you like to do?`,
      artifact: { kind: 'dashboard', title: 'CLM dashboard' },
      actions: [
        { label: 'Review the Vishay redline', prompt: 'review the Vishay redline', variant: 'primary' },
        { label: 'Create a new NDA', prompt: 'create a new NDA' },
        { label: "What's on my plate?", prompt: "what's on my plate?" },
      ],
    }),
  },
]

function route(text: string): { reply: AgentReply; matched: boolean } {
  const t = text.toLowerCase().trim()
  const role = currentRole()
  for (const i of intents) {
    if (!i.test(t)) continue
    if (i.cap && !can(role, i.cap)) return { reply: denial(role, i.cap), matched: true }
    return { reply: i.reply(t), matched: true }
  }
  return {
    matched: false,
    reply: {
      text: `I can help with that within the contract workflow. Try one of these, or ask about a specific deal (Vishay, Airbus, Northwind, Mondelez).`,
      actions: [
        { label: 'Review the Vishay redline', prompt: 'review the Vishay redline', variant: 'primary' },
        { label: 'Show the dashboard', prompt: 'show me the dashboard' },
        { label: 'Create a new NDA', prompt: 'create a new NDA' },
      ],
    },
  }
}

// Build grounding context for the live model from current store state.
function buildContext(): string {
  const s = useStore.getState()
  const pb = s.playbooks[0]
  const devs = s.deviations.filter((d) => d.agreement_id === 'AGR-2201')
  const lines: string[] = []
  lines.push(`Active deal: Vishay Intertechnology Mutual NDA (CP paper, redline received). Counterparty returned Draft 2.`)
  lines.push(`Playbook "${pb.name}" provisions: ${pb.provisions.map((p) => `${p.provision_name} (negotiated ${p.negotiated_pct ?? 0}%, ${p.fallback_tiers.length} fallback(s); red line: ${p.red_line})`).join('; ')}.`)
  lines.push(`Vishay deviations: ${devs.map((d) => `${d.provision_name} ${d.section_reference} [${d.risk_category}] — template: ${d.template_position} | counterparty: ${d.counterparty_position} | recommended: ${d.recommended_response} (disposition: ${d.disposition_status})`).join(' || ')}.`)
  lines.push(`Other deals: Airbus NDA (in negotiation, SLA risk), Northwind CaaS (MSA/DPA/SOW, no playbook), Mondelez & Clever Devices (executed).`)
  // R44 — carry the executed-precedent corpus so the assistant reasons over real prior deals (never fabricated).
  lines.push(`Executed precedent corpus:\n${precedentDigest()}`)
  return lines.join('\n')
}

// Attempt a live model call via the serverless endpoint. Returns null if unavailable (→ fallback).
async function callLiveModel(text: string): Promise<string | null> {
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: text, context: buildContext() }),
    })
    if (!r.ok) return null
    const j = await r.json()
    if (j?.error || !j?.text) return null
    return j.text as string
  } catch {
    return null
  }
}

// ---- public API -------------------------------------------------------------
export function openArtifact(a: { kind: ArtifactKind; refId?: string; title?: string }) {
  const s = useStore.getState()
  switch (a.kind) {
    case 'redline_review':
    case 'agreement': s.openAgreement(a.refId ?? 'AGR-2201', 'review'); break
    case 'document':
      s.openAgreement(a.refId ?? 'AGR-2201', 'review')
      s.navigate({ reviewMode: 'document' })
      break
    case 'ticket': s.openTicket(a.refId ?? 'TKT-1042'); break
    case 'playbook': s.setView('playbook'); s.navigate({ playbookMode: 'inventory' }); break
    case 'playbook_create': s.openCanvas({ view: 'playbook', playbookMode: 'create' }); break
    case 'playbook_suggestions': s.openCanvas({ view: 'playbook', playbookMode: 'suggestions' }); break
    case 'redline_doc': s.openSendBack(a.refId ?? 'AGR-2201'); s.navigate({ reviewMode: 'redline' }); break
    case 'send_back': s.openSendBack(a.refId ?? 'AGR-2201'); break
    case 'deal_execution': s.openDealExecution(a.refId ?? 'TKT-1031'); break
    case 'projects': s.openProjects(a.refId || undefined, false); break
    case 'template': { const tpl = s.templates.find((x) => x.id === a.refId); s.openProjects(tpl?.project_id || undefined, false); if (a.refId) s.navigate({ templateId: a.refId }); break }
    case 'dashboard': s.setView('dashboard'); break
    case 'deal_summary': s.openCanvas({ view: 'deal_summary', dealSummaryId: a.refId ?? 'AGR-2150' }); break
    case 'tagged_items': s.openCanvas({ view: 'queue' }); break
    case 'intake_form': s.openCanvas({ view: 'intake', intakeCp: a.refId || undefined }); break
    case 'execution': s.openCanvas({ view: 'execution', executionAgreementId: a.refId ?? 'AGR-2201', executionTicketId: undefined }); break
    case 'admin': s.setView('admin'); break
    case 'audit': s.setView('audit'); break
    case 'repository': s.setView('repository'); break
    case 'contracts': s.openContracts('all', false); break
    case 'ticket_created': s.setView('dashboard'); break
    default: break
  }
}

const pushAgent = (reply: AgentReply) => {
  // Mutations (dispositions, approvals, ticket creation, …) run immediately.
  reply.effect?.()
  useStore.getState().pushChat({
    id: cid(), role: 'agent', text: reply.text, ts: ts(),
    artifact: reply.artifact, actions: reply.actions, aiGenerated: true,
  })
  // Navigation is click-to-open: from the hero we never auto-open the right pane —
  // the user clicks the artifact chip. If a workspace is already docked, we keep it in sync.
  if (useStore.getState().canvas.open && reply.artifact && reply.artifact.kind !== 'none') {
    openArtifact(reply.artifact)
  }
  useStore.getState().setAgentThinking(false)
}

export function sendToAgent(text: string) {
  const store = useStore.getState()
  store.pushChat({ id: cid(), role: 'user', text, ts: ts() })
  store.setAgentThinking(true)

  const { reply, matched } = route(text)

  if (matched) {
    // Brief, snappy "thinking" beat (R12 — was 600–1200ms; the agent should feel fast at scale).
    const delay = 220 + Math.min(text.length * 3, 260)
    setTimeout(() => pushAgent(reply), delay)
    return
  }

  // Off-script → try the live model; gracefully fall back to the deterministic reply.
  callLiveModel(text).then((live) => {
    if (live) {
      pushAgent({ text: live, actions: reply.actions })
    } else {
      pushAgent(reply)
    }
  })
}

