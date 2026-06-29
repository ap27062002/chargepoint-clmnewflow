import { useStore, agreementDeviations } from '@/store'
import type { ChatMessage, ChatAction, ArtifactKind, Role } from '@/types'
import { userById } from '@/data/seed'
import { can, CAP_LABEL, ROLE_LABEL, ROLE_SCOPE, startersFor, type Capability } from '@/lib/access'
import { canSeeTicket } from '@/lib/scope'
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
    name: 'tagged',
    test: (t) => has(t, 'tagged', 'assigned to me', 'my plate', "what's on me", 'waiting on me', 'sign-off', 'sign off'),
    reply: () => {
      const s = useStore.getState()
      const uid = s.currentUserId
      const mentions = s.messages.filter((m) => m.mentions?.includes(uid) && !m.resolved)
      const myTickets = s.tickets.filter((t) => t.assigned_attorney_id === uid && t.status !== 'Executed' && t.status !== 'Resolved')
      return {
        text: `Here's everything currently on your plate, ${userById(uid)?.name.split(' ')[0]}.\n\n**${mentions.length} provision sign-off${mentions.length === 1 ? '' : 's'} awaiting you** and **${myTickets.length} active ticket${myTickets.length === 1 ? '' : 's'}** assigned to you. The Airbus NDA (TKT-1039) is at **80% of its SLA window** — I'd take that first.`,
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
      return {
        text: `I analyzed **Vishay Intertechnology's Draft 2 redline** against the NDA playbook. **${devs.length} deviations** — ${red} red line, ${neg} negotiate, ${acc} accept, and a couple of QA flags.\n\nThe one that matters most: counterparty added a **Residuals clause (§1(f))** — that's an explicit playbook **red line**, and InfoSec agrees it has to come out. Term was stretched to 3 years and CI survival cut to 2 — both land on approved fallbacks.\n\n${open} are still open. **Open the Issues View** (below, sorted by risk) to step through them — Apply / Skip / Reject each, or I can apply all recommended dispositions.`,
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
    reply: () => ({
      text: `**Residuals — playbook red line (do not accept).**\n\nA residuals clause lets the other side freely use anything their people "retain in unaided memory" — ideas, know-how, techniques — for any purpose. In practice it **guts trade-secret protection**: an engineer who saw our battery-evaluation data could reuse it and argue it was just "in their memory."\n\n- **Playbook position:** §4 exclusions are the five standard ones only. Residuals is listed as a strict red line.\n- **Precedent:** rejected in every deal in the sample set where it was introduced (Subaru, Microchip).\n- **InfoSec (Priya Anand):** has separately flagged it as a hard no on this deal.\n\n**Recommendation:** reject §1(f) in full in our response. I've marked it accordingly in the Issues View.`,
      artifact: { kind: 'redline_review', refId: 'AGR-2201', title: 'Vishay NDA — Residuals (§1(f))' },
      actions: [
        { label: 'Reject §1(f) residuals', prompt: 'reject the residuals deviation', variant: 'primary' },
        { label: 'Show the playbook clause', prompt: 'show me the NDA playbook' },
      ],
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
    test: (t) => has(t, 'generate', 'draft our', 'our response', 'redline response', 'counter', 'clean copy', 'clean and redline'),
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
      text: `Each agreement moves through this lifecycle:\n\n**Draft → Internal Review → Sent to Counterparty → Redline Received → Pending Execution → Executed**\n\nSending to the counterparty is **gated by an approval chain** (senior counsel + privacy), and execution runs through DocuSign. Open the Vishay NDA below — the **lifecycle bar at the top** shows the current stage, the "Advance to next stage" button, and any pending approvals inline.`,
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
    test: (t) => has(t, 'create', 'new nda', 'draft nda', 'start an nda', 'new agreement', 'new ticket') && !has(t, 'response'),
    reply: (t) => {
      const m = t.match(/(?:for|with)\s+([a-z0-9 .&'-]{2,40})/i)
      const cp = m?.[1] ? m[1].replace(/\b\w/g, (c) => c.toUpperCase()).trim() : ''
      return {
        text: `Starting a new **Mutual NDA**${cp ? ` for **${cp}**` : ''} on ChargePoint paper. Before I draft, a few quick questions — I'll pull what I can from CRM:\n\n1. **Counterparty entity & address** — ${cp ? `I'll look up ${cp} in CRM first, internet as fallback.` : 'who is the counterparty?'}\n2. **Purpose / business context** — template default (broad) or a specific purpose?\n3. **Assigned attorney** — default to you (Kirsten Sachs)?\n\nOpen the intake form below to fill it in, or say *"use defaults"* and I'll generate V1 from the CP Mutual NDA 2025 template, create the ticket and deal folder, and run a key-field QA check.`,
        artifact: { kind: 'intake_form', refId: cp, title: cp ? `New NDA — ${cp}` : 'New NDA — intake' },
        actions: [
          { label: 'Use defaults & generate', prompt: `use defaults and generate the NDA${cp ? ` for ${cp}` : ''}`, variant: 'primary' },
          { label: 'Specific purpose…', prompt: 'let me specify the purpose' },
        ],
      }
    },
  },
  {
    name: 'create_confirm', cap: 'intake',
    test: (t) => has(t, 'use defaults') && has(t, 'generate', 'nda'),
    reply: (t) => {
      const m = t.match(/for\s+([a-z0-9 .&'-]{2,40})/i)
      const cp = (m?.[1] || 'New Counterparty').replace(/\b\w/g, (c) => c.toUpperCase()).trim()
      return {
        text: `Generated. ✅\n\n- Created ticket and **${cp} Mutual NDA** (V1) from the CP Mutual NDA 2025 template.\n- Populated parties, entity, and address from CRM; ran key-field QA (no issues).\n- Routed to **Kirsten Sachs** (expertise match) and added the deal to the dashboard at **Draft**.\n\nIt's ready for your review whenever you are.`,
        artifact: { kind: 'ticket_created', title: `${cp} — NDA created` },
        effect: () => {
          useStore.getState().createTicketFromAgent({
            title: `${cp} — Mutual NDA`, counterparty_name: cp, type: 'single_agreement',
            priority: 'normal', description: `NDA generated from CP Mutual NDA 2025 template for ${cp}.`,
          })
        },
        actions: [
          { label: 'Show the dashboard', prompt: 'show me the dashboard', variant: 'primary' },
          { label: 'Create another', prompt: 'create a new NDA' },
        ],
      }
    },
  },
  {
    name: 'playbook', cap: 'playbook_view',
    test: (t) => has(t, 'playbook'),
    reply: (t) => {
      if (has(t, 'add', 'residual', 'new provision', 'fallback', 'edit', 'create')) {
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
    case 'playbook': s.setView('playbook'); break
    case 'dashboard': s.setView('dashboard'); break
    case 'deal_summary': s.openCanvas({ view: 'deal_summary', dealSummaryId: a.refId ?? 'AGR-2150' }); break
    case 'tagged_items': s.openCanvas({ view: 'queue' }); break
    case 'intake_form': s.openCanvas({ view: 'intake', intakeCp: a.refId || undefined }); break
    case 'execution': s.openCanvas({ view: 'execution', executionAgreementId: a.refId ?? 'AGR-2201' }); break
    case 'admin': s.setView('admin'); break
    case 'audit': s.setView('audit'); break
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
    const delay = 600 + Math.min(text.length * 7, 600)
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

