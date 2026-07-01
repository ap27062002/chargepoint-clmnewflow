// ============================================================================
// Precedent retrieval (Eric R44) — the assistant carries the playbook AND all
// previously executed contracts. This builds a real, queryable corpus from actual
// seed data (executed-deal deviation dispositions + executed clause bodies) and
// answers precedent questions from it. No fabricated deals: every citation names a
// contract that exists in the system. Deterministic; a live model reasons over the
// SAME corpus once a key is set (buildContext embeds precedentDigest()).
// ============================================================================
import type { RiskCategory, DispositionStatus } from '@/types'
import { deviations, agreements, tickets } from '@/data/seed'
import { precedentClauses } from '@/data/executed'

export interface PrecedentOutcome {
  agreementId: string
  counterparty: string
  provision: string
  section: string
  risk: RiskCategory
  counterpartyMove: string
  ourResponse: string
  disposition: DispositionStatus
  executedDate: string
}

const executedAgreementIds = () => agreements.filter((a) => a.status === 'executed').map((a) => a.id)
const cpFor = (agreementId: string) => {
  const a = agreements.find((x) => x.id === agreementId)
  return tickets.find((t) => t.id === a?.ticket_id)?.counterparty_name ?? 'Counterparty'
}

// Build the corpus at call time from real records — nothing hardcoded.
export function precedentCorpus(): PrecedentOutcome[] {
  const executed = executedAgreementIds()
  const clauseByAgreement = new Map(precedentClauses().map((r) => [r.agreementId, r]))
  const out: PrecedentOutcome[] = []
  // 1) Negotiated outcomes = the deviation dispositions on executed deals.
  for (const d of deviations) {
    if (!executed.includes(d.agreement_id)) continue
    const rec = clauseByAgreement.get(d.agreement_id)
    out.push({
      agreementId: d.agreement_id, counterparty: cpFor(d.agreement_id),
      provision: d.provision_name, section: d.section_reference, risk: d.risk_category,
      counterpartyMove: d.counterparty_position, ourResponse: d.recommended_response,
      disposition: d.disposition_status, executedDate: rec?.effectiveDate ?? '',
    })
  }
  // 2) Accepted-as-executed clause facts (so queries about term/governing-law have precedent even
  //    where no deviation was raised) — derived from the actual executed clause text.
  for (const rec of precedentClauses()) {
    if (!executed.includes(rec.agreementId)) continue
    for (const c of rec.clauses) {
      if (!/term|governing|injunctive|marking|residual/i.test(c.heading)) continue
      if (out.some((o) => o.agreementId === rec.agreementId && o.section === c.ref)) continue
      out.push({
        agreementId: rec.agreementId, counterparty: rec.counterparty, provision: c.heading, section: c.ref,
        risk: 'accept', counterpartyMove: '—', ourResponse: c.text, disposition: 'accepted', executedDate: rec.effectiveDate,
      })
    }
  }
  return out
}

// query → provision axis synonyms
const SYNONYMS: { axis: RegExp; words: string[] }[] = [
  { axis: /residual/i, words: ['residual', 'unaided memory'] },
  { axis: /indemnif/i, words: ['indemnity', 'indemnif'] },
  { axis: /term|survival/i, words: ['term', 'survival', 'duration', 'expire'] },
  { axis: /governing|venue/i, words: ['governing law', 'jurisdiction', 'venue', 'delaware', 'new york'] },
  { axis: /injunctive/i, words: ['injunctive', 'bond', 'irreparable'] },
  { axis: /marking|identification/i, words: ['marking', 'designation', 'identify'] },
  { axis: /liability|cap/i, words: ['liability', 'cap', 'damages'] },
  { axis: /return|destruction/i, words: ['return', 'destroy', 'archival', 'retain'] },
]

export function searchPrecedent(query: string): PrecedentOutcome[] {
  const q = query.toLowerCase()
  const corpus = precedentCorpus()
  const matchers = SYNONYMS.filter((s) => s.words.some((w) => q.includes(w)) || s.axis.test(q))
  if (!matchers.length) return []
  return corpus
    .filter((o) => matchers.some((m) => m.axis.test(o.provision) || m.words.some((w) => o.provision.toLowerCase().includes(w))))
    .sort((a, b) => (a.risk === 'red_line' ? -1 : 1) - (b.risk === 'red_line' ? -1 : 1))
}

// One line per executed agreement, for buildContext() grounding.
export function precedentDigest(): string {
  const byAgreement = new Map<string, PrecedentOutcome[]>()
  for (const o of precedentCorpus()) { if (!byAgreement.has(o.agreementId)) byAgreement.set(o.agreementId, []); byAgreement.get(o.agreementId)!.push(o) }
  const lines: string[] = []
  byAgreement.forEach((outcomes, id) => {
    const cp = outcomes[0].counterparty
    const facts = outcomes.slice(0, 5).map((o) => `${o.section} ${o.provision} [${o.disposition}]`).join('; ')
    lines.push(`• ${cp} (${id}, executed ${outcomes[0].executedDate}): ${facts}`)
  })
  return lines.join('\n')
}

// Compose an input-dependent answer from the matched records; honest empty branch.
export function precedentAnswer(query: string): string {
  const hits = searchPrecedent(query)
  if (hits.length) {
    const body = hits.map((o) => `• **${o.counterparty}** (${o.section} ${o.provision}, executed ${o.executedDate}): counterparty ${o.counterpartyMove === '—' ? 'position' : `“${o.counterpartyMove}”`} → we **${o.disposition}** — ${o.ourResponse}`).join('\n')
    return `From ChargePoint's executed-agreement precedent:\n\n${body}`
  }
  // No executed precedent — check whether the topic appears on a live (unexecuted) deal, and say so honestly.
  const liveHit = deviations.find((d) => agreements.find((a) => a.id === d.agreement_id)?.status !== 'executed'
    && SYNONYMS.some((s) => (s.axis.test(d.provision_name)) && s.words.some((w) => query.toLowerCase().includes(w))))
  if (liveHit) {
    const cp = cpFor(liveHit.agreement_id)
    return `No **executed** ChargePoint agreement in the corpus addresses that. The only occurrence is the live ${cp} deal (${liveHit.section_reference} ${liveHit.provision_name}) — so there is no accepted precedent for it yet.`
  }
  return `No executed ChargePoint agreement in the corpus addresses “${query.trim()}”, and it doesn't appear on any live deal — there is no precedent on record.`
}
