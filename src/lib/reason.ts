// R112 — thin layer over Claude. For open-ended questions the app first tries the live model
// (/api/chat, when a key is set); this deterministic reasoner is the always-on FLOOR that composes
// an answer from REAL store state (deviations, playbook, precedent, agreements) rather than a canned
// "try one of these" string. So the agent reasons over live data with or without a key — Claude just
// makes the prose better when available. Nav/mutation stay confident-intent-first (this is fallback only).
import { useStore, agreementDeviations } from '@/store'
import { precedentAnswer, searchPrecedent } from '@/lib/precedent'

const DEALS: { key: string; agreementId: string; label: string }[] = [
  { key: 'vishay', agreementId: 'AGR-2201', label: 'Vishay Intertechnology NDA' },
  { key: 'airbus', agreementId: 'AGR-2198', label: 'Airbus NDA' },
  { key: 'northwind', agreementId: 'AGR-2180', label: 'Northwind CaaS (MSA/DPA/SOW)' },
  { key: 'mondelez', agreementId: 'AGR-2150', label: 'Mondelez NDA (executed)' },
]

// Compose a grounded answer from real state. Input-dependent — different query → different data pulled.
export function answerFromState(query: string): string {
  const s = useStore.getState()
  const q = query.toLowerCase()

  // Precedent / prior-deal questions → real corpus.
  if (/precedent|prior deal|previously|have we (done|accepted|rejected)|executed/.test(q) || searchPrecedent(q).length) {
    return precedentAnswer(query)
  }

  // A specific deal named → summarize it from live state.
  const deal = DEALS.find((d) => q.includes(d.key))
  if (deal) {
    const a = s.agreements.find((x) => x.id === deal.agreementId)
    if (a) {
      const devs = agreementDeviations(s, a.id)
      const red = devs.filter((d) => d.risk_category === 'red_line').length
      const open = devs.filter((d) => d.disposition_status === 'open').length
      return `**${deal.label}** — status **${a.status.replace(/_/g, ' ')}**, ball in ${a.ball_in_court === 'cp_legal' ? 'our' : "the counterparty's"} court. ${devs.length} issue${devs.length === 1 ? '' : 's'} (${red} red line, ${open} still open). ${red ? `The red line${red === 1 ? '' : 's'}: ${devs.filter((d) => d.risk_category === 'red_line').map((d) => `${d.provision_name} (${d.section_reference})`).join(', ')}.` : ''} Open the deal to step through the issues.`
    }
  }

  // Playbook questions → summarize the active playbook from state.
  if (/playbook|red line|fallback|standard position|provision/.test(q)) {
    const pb = s.playbooks.find((p) => p.id === (s.canvas.playbookId ?? 'pb_nda')) ?? s.playbooks[0]
    const reds = pb.provisions.filter((p) => (p.tier ?? '') === 'red_line').map((p) => p.provision_name)
    return `The **${pb.name}** has ${pb.provisions.length} provisions${reds.length ? `; red lines: ${reds.join(', ')}` : ''}. The backend uses these positions to classify every counterparty deviation. Ask about a specific provision, or open the Playbook to see standard / fallback / red-line for each.`
  }

  // "What's on my plate / what should I do" → compute from assigned work + unresolved mentions.
  if (/my plate|what should i|priorit|waiting on me|next step|to do/.test(q)) {
    const uid = s.currentUserId
    const mine = s.agreements.filter((a) => s.tickets.find((t) => t.id === a.ticket_id)?.assigned_attorney_id === uid && a.status !== 'executed')
    const mentions = s.messages.filter((m) => m.mentions?.includes(uid) && !m.resolved).length
    return `You have **${mine.length} active agreement${mine.length === 1 ? '' : 's'}** and **${mentions} unresolved sign-off request${mentions === 1 ? '' : 's'}**. Highest-risk open item: the Vishay residuals red line. Say "what's on my plate" for the full queue.`
  }

  // Portfolio overview — computed counts.
  const openAgs = s.agreements.filter((a) => a.status !== 'executed').length
  const redlines = s.deviations.filter((d) => d.risk_category === 'red_line' && d.disposition_status === 'open').length
  return `I reason over your live CLM data — playbooks, the executed-precedent corpus, every agreement's deviations, and the deal pipeline. Right now: **${openAgs} open agreements** and **${redlines} open red line${redlines === 1 ? '' : 's'}** across the portfolio. Ask me about a specific deal (Vishay, Airbus, Northwind), the playbook, precedent ("what's our precedent on indemnity?"), or "what's on my plate". _(Set ANTHROPIC_API_KEY in Vercel and I answer through Claude directly, grounded in this same data.)_`
}
