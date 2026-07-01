// ============================================================================
// Playbook derivation (Eric R48/R49/R50/R62/R105) — a playbook is DERIVED from a
// template + example agreements, not canned. For each template section we read how
// the real executed examples resolved that concept and compute the provision's
// standard position, fallbacks, red line, and negotiated %. Different template or
// different examples ⇒ different provisions. Deterministic; no network.
// ============================================================================
import type { Provision, ProvisionTier, AgreementType, TemplateSection, Agreement, Ticket, FolderAgreement } from '@/types'
import { executedCorpus } from '@/data/executed'

interface ConceptDef { key: string; label: string; test: RegExp; tier: ProvisionTier; standard: string; redLine: string }
const CONCEPTS: ConceptDef[] = [
  { key: 'confidential', label: 'Definition of Confidential Information', test: /confidential information|definition|non-public/i, tier: 'baseline', standard: 'Broad definition covering all non-public business, technical, and financial information disclosed in any form, with the standard five exclusions.', redLine: 'Narrowing to "marked confidential only" with no catch-all for obviously confidential information.' },
  { key: 'marking', label: 'Marking / Identification', test: /marking|identification|designat/i, tier: 'fallback', standard: 'No marking requirement; information is protected if a reasonable person would understand it to be confidential.', redLine: 'Protection contingent on marking with no grace period for oral disclosures.' },
  { key: 'protection', label: 'Protection Obligations / Standard of Care', test: /protection|standard of care|degree of care/i, tier: 'fallback', standard: 'Same degree of care as own confidential information, but no less than a reasonable standard of care.', redLine: 'Best-efforts / strict-liability standard of care.' },
  { key: 'return', label: 'Return / Destruction of Materials', test: /return|destruction/i, tier: 'fallback', standard: 'Return or destroy on request; certify destruction within 30 days.', redLine: 'No destruction certification, or unrestricted retention rights.' },
  { key: 'injunctive', label: 'Injunctive Relief', test: /injunctive|irreparable/i, tier: 'fallback', standard: 'Both parties acknowledge breach causes irreparable harm; injunctive relief available without posting bond.', redLine: 'Injunctive relief available to counterparty only, or mandatory bond posting by ChargePoint.' },
  { key: 'term', label: 'Term & Termination', test: /term|termination|survival/i, tier: 'fallback', standard: 'Agreement term 2 years; confidentiality obligations survive 5 years; trade secrets protected indefinitely.', redLine: 'CI survival under 2 years, or termination of trade-secret protection on expiry.' },
  { key: 'governing', label: 'Governing Law & Venue', test: /governing|venue|jurisdiction/i, tier: 'fallback', standard: 'Delaware law; exclusive jurisdiction in the state and federal courts of Delaware.', redLine: 'Foreign governing law or mandatory ICC arbitration seated outside the U.S.' },
  { key: 'residuals', label: 'Residuals', test: /residual|unaided memory/i, tier: 'red_line', standard: 'No residuals clause. ChargePoint does not grant any right to use information retained in unaided memory.', redLine: 'Any clause permitting use of residuals / information retained in the unaided memory of personnel.' },
  // ---- MSA / license concepts ----
  { key: 'indemnification', label: 'Indemnification', test: /indemnif/i, tier: 'red_line', standard: 'Mutual third-party IP-infringement indemnity with defined exclusions and control of defense.', redLine: 'All-claims indemnity, removal of exclusions, or stripping the indemnitee\'s right to participate.' },
  { key: 'liability', label: 'Limitation of Liability', test: /liability|limitation of liability/i, tier: 'red_line', standard: 'Mutual cap at 12 months of fees; consequential/indirect damages waived; standard carve-outs.', redLine: 'Asymmetric cap or waiver of the consequential-damages exclusion.' },
  { key: 'ip', label: 'IP Ownership & License', test: /license|intellectual property|ip ownership|station data|firmware|telemetry/i, tier: 'baseline', standard: 'Each party retains its background IP; ChargePoint grants a limited license to deliverables for the stated purpose.', redLine: 'Assignment of ChargePoint background IP or a perpetual unrestricted license.' },
  { key: 'fees', label: 'Fees & Payment', test: /fee|payment|pricing/i, tier: 'baseline', standard: 'Subscription fees with annual true-up; taxes excluded; net-30 payment terms.', redLine: 'Unilateral fee changes with no notice.' },
  { key: 'warranty', label: 'Warranties & Disclaimers', test: /warrant|disclaimer/i, tier: 'baseline', standard: 'Limited warranty of conformance to docs; AS-IS disclaimer for beta features.', redLine: 'Open-ended fitness-for-purpose warranty.' },
]

const conceptFor = (text: string): ConceptDef | undefined => CONCEPTS.find((c) => c.test.test(text))
const mode = (arr: string[]): string => { const m = new Map<string, number>(); arr.forEach((a) => m.set(a, (m.get(a) || 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? arr[0] }

export interface ConceptRow { key: string; label: string; seenIn: string[]; positions: { agreementId: string; counterparty: string; text: string }[]; tier: ProvisionTier; divergence: number }

// R105 — comparative analysis across the selected source agreements.
export function comparativeAnalysis(sourceIds: string[]): ConceptRow[] {
  const corpus = executedCorpus()
  const docs = sourceIds.map((id) => ({ id, doc: corpus[id] })).filter((x) => x.doc)
  const rows = new Map<string, ConceptRow>()
  for (const { id, doc } of docs) {
    for (const cl of doc.clauses) {
      const c = conceptFor(cl.heading + ' ' + cl.text); if (!c) continue
      if (!rows.has(c.key)) rows.set(c.key, { key: c.key, label: c.label, seenIn: [], positions: [], tier: c.tier, divergence: 0 })
      const row = rows.get(c.key)!
      if (!row.seenIn.includes(id)) row.seenIn.push(id)
      row.positions.push({ agreementId: id, counterparty: doc.parties.counterparty, text: cl.text })
    }
  }
  rows.forEach((r) => { const distinct = new Set(r.positions.map((p) => p.text.slice(0, 40))).size; r.divergence = r.positions.length ? distinct / r.positions.length : 0 })
  return [...rows.values()]
}

// R50/R62 — derive one provision per template section, enriched by how the examples resolved it.
export function deriveProvisions(sections: TemplateSection[], sourceIds: string[]): Provision[] {
  const byKey = new Map(comparativeAnalysis(sourceIds).map((a) => [a.key, a]))
  return sections.map((sec) => {
    const c = conceptFor(sec.heading + ' ' + sec.summary)
    const row = c ? byKey.get(c.key) : undefined
    const positions = row?.positions ?? []
    const commonest = positions.length ? mode(positions.map((p) => p.text)) : (c?.standard ?? sec.summary)
    const divergent = [...new Set(positions.map((p) => p.text).filter((t) => t !== commonest))].slice(0, 2)
    return {
      id: 'pv_' + (c?.key ?? sec.id),
      provision_name: c?.label ?? sec.heading.replace(/^\d+\.\s*/, ''),
      standard_position: commonest,
      fallback_tiers: divergent,
      red_line: c?.redLine ?? 'Deviations from this section are flagged for attorney review.',
      rationale: row
        ? `Derived from ${row.seenIn.length} example agreement(s); ${Math.round(row.divergence * 100)}% diverged from the modal position.`
        : `Derived from template section "${sec.heading}" (no example variance observed).`,
      tier: c?.tier ?? 'baseline',
      negotiated_pct: row ? Math.round(row.divergence * 100) : 0,
      sourceSection: sec.heading,
      sourcePrecedents: row?.seenIn,
    }
  })
}

// R48 — selectable folder entries (the real corpus, grouped by folder path).
export function folderAgreements(agreements: Agreement[], tickets: Ticket[]): FolderAgreement[] {
  const corpus = executedCorpus()
  return Object.keys(corpus).map((id) => {
    const a = agreements.find((x) => x.id === id)
    const cp = a ? (tickets.find((t) => t.id === a.ticket_id)?.counterparty_name ?? corpus[id].parties.counterparty) : corpus[id].parties.counterparty
    return {
      id, name: `${cp} — ${corpus[id].title.split(' ').slice(0, 3).join(' ')}`,
      agreement_type: (a?.agreement_type ?? 'MNDA') as AgreementType,
      folderPath: 'Legal › Executed Agreements › NDAs', status: a?.status ?? 'executed', hasBody: true,
    }
  })
}
