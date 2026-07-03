// ============================================================================
// Playbook analysis engine (Eric R43) — the issues list is a DERIVED artifact.
// On intake of a counterparty draft we diff it against the prior version, map
// each changed clause to a playbook provision, and classify it against that
// provision's real standard / fallback / red-line positions. The output IS the
// issues list. Fully deterministic (no network) — same result with or without a
// key; a live model would only rewrite prose, never the classification or count.
// ============================================================================
import type { Deviation, Playbook, Provision, RiskCategory, Direction, ImpactArea, CrossCuttingCategory } from '@/types'
import { type DocModel, type DocClause, diffVersions, effectiveText, type ClauseDiff } from '@/data/documents'

const lc = (s: string) => s.toLowerCase()
export const tokenSet = (s: string): Set<string> =>
  new Set(lc(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2))

// token-set similarity (Jaccard) — used to test whether counterparty text matches a fallback tier
function similarity(a: string, b: string): number {
  const A = tokenSet(a), B = tokenSet(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  A.forEach((t) => { if (B.has(t)) inter++ })
  return inter / (A.size + B.size - inter)
}

// ---- clause → provision mapping -------------------------------------------
// Keyword axes; each maps a clause to the provision axis it belongs to. Adding a
// provision + keywords here auto-extends matching (data-driven, not per-clause).
const AXES: { axis: string; words: string[]; provisionMatch: (p: Provision) => boolean }[] = [
  { axis: 'residual', words: ['residual', 'unaided memory', 'retained in the'], provisionMatch: (p) => /residual/i.test(p.provision_name) },
  { axis: 'term', words: ['remain in effect', 'survive', 'survival', 'years from', 'trade secret', 'term of'], provisionMatch: (p) => /term|termination/i.test(p.provision_name) },
  { axis: 'injunctive', words: ['injunctive', 'irreparable', 'bond'], provisionMatch: (p) => /injunctive/i.test(p.provision_name) },
  { axis: 'marking', words: ['marking', 'designat', 'proprietary information', 'oral disclosure'], provisionMatch: (p) => /marking|identification|oral/i.test(p.provision_name) },
  { axis: 'return', words: ['return', 'destroy', 'destruction', 'archival', 'retain'], provisionMatch: (p) => /return|destruction/i.test(p.provision_name) },
  { axis: 'data', words: ['data controller', 'controller', 'personal data', 'data protection'], provisionMatch: (p) => /data|privacy|controller/i.test(p.provision_name) },
  { axis: 'export', words: ['export', 'itar', 'ear', 'restricted information', 'pre-clearance'], provisionMatch: (p) => /export/i.test(p.provision_name) },
  { axis: 'governing', words: ['governing law', 'jurisdiction', 'venue', 'delaware'], provisionMatch: (p) => /governing|venue/i.test(p.provision_name) },
  { axis: 'affiliate', words: ['affiliate', 'representative'], provisionMatch: (p) => /affiliate|representative/i.test(p.provision_name) },
  { axis: 'definition', words: ['confidential information means', 'non-public', 'excluded'], provisionMatch: (p) => /definition|exclusion/i.test(p.provision_name) },
  { axis: 'protection', words: ['degree of care', 'protect'], provisionMatch: (p) => /protection|standard of care/i.test(p.provision_name) },
]

function axisForText(text: string): string | undefined {
  const t = lc(text)
  let best: { axis: string; hits: number } | undefined
  for (const a of AXES) {
    const hits = a.words.filter((w) => t.includes(w)).length
    if (hits > 0 && (!best || hits > best.hits)) best = { axis: a.axis, hits }
  }
  return best?.axis
}

export function mapClauseToProvision(clause: DocClause, playbook: Playbook): { provision?: Provision; axis?: string; label: string } {
  const flat: Provision[] = []
  const walk = (ps: Provision[]) => ps.forEach((p) => { flat.push(p); if (p.children) walk(p.children) })
  walk(playbook.provisions)
  const axis = axisForText(clause.heading + ' ' + effectiveText(clause))
  const axisDef = AXES.find((a) => a.axis === axis)
  const provision = axisDef ? flat.find(axisDef.provisionMatch) : undefined
  // human label falls back to the clause heading (minus numbering) when no provision matches
  const label = provision?.provision_name ?? (clause.heading.replace(/^[\d.()§ ]+/, '').trim() || clause.ref)
  return { provision, axis, label }
}

const CATEGORY_IMPACT: Record<CrossCuttingCategory, ImpactArea> = {
  liability: 'financial', indemnification: 'financial', confidentiality: 'operational',
  ip_ownership: 'ip', data_privacy: 'data', term_and_termination: 'operational',
}

// ---- classification: real rules over the actual counterparty text ----------
export function classifyChange(diff: ClauseDiff, prov: Provision | undefined, axis: string | undefined): { risk: RiskCategory; direction: Direction; response: string } {
  const inc = lc(diff.bText)
  const removed = lc(diff.aText)

  // NEW clause the counterparty introduced that maps to a red-line provision
  if (axis === 'residual' || /\bresidual/.test(inc) || /unaided memory/.test(inc)) {
    return { risk: 'red_line', direction: 'cp_unfavorable', response: `RED LINE — reject. ${prov?.red_line ?? 'Residuals clauses gut trade-secret protection by permitting use of information retained in unaided memory.'}` }
  }
  // Defined-term inconsistency: a defined term swapped for a different one
  if (axis === 'marking' && /proprietary information/.test(inc) && /confidential information/.test(removed)) {
    return { risk: 'red_line', direction: 'neutral', response: 'RED LINE / QA — the counterparty swapped the defined term "Confidential Information" for an undefined "Proprietary Information", creating a definitional inconsistency. Reject or define consistently.' }
  }
  // Term / survival window shortened
  if (axis === 'term') {
    const survivalCut = /two \(2\) years/.test(inc) && /five \(5\) years/.test(removed)
    if (survivalCut) return { risk: 'negotiate', direction: 'cp_unfavorable', response: `Counter to Fallback: ${prov?.fallback_tiers?.[0] ?? 'CI survival of 3 years is acceptable; do not accept survival below 2 years.'} Confidentiality survival was reduced — hold at ≥3 years.` }
    return { risk: 'negotiate', direction: 'cp_unfavorable', response: `Counter — align the term/survival window to the playbook. ${prov?.fallback_tiers?.[0] ?? ''}`.trim() }
  }
  // Injunctive relief + bond
  if (axis === 'injunctive') {
    return { risk: 'negotiate', direction: 'cp_unfavorable', response: 'Counter — remove the bond requirement; ChargePoint\'s standard is injunctive relief without posting a bond. A "commercially reasonable" bond is a fallback, not the standard.' }
  }
  // Data-controller designation added (enhancement to flag to Privacy)
  if (axis === 'data') {
    return { risk: 'enhancement', direction: 'cp_favorable', response: 'Enhancement — flag to Privacy. The "data controller" designation may not be accurate for a no-PII NDA; prefer a no-PII-expected recital. Tag for sign-off.' }
  }
  // Export / undefined restricted-information term
  if (axis === 'export' && /restricted information/.test(inc)) {
    return { risk: 'missing', direction: 'neutral', response: 'MISSING/inconsistent — "Restricted Information" is referenced but never defined and the pre-clearance obligation has no scope. Define it or strike. Flagged for QA.' }
  }
  // Retain-archival-copy for legal hold → matches approved fallback
  if (axis === 'return' && /(archival|retain)/.test(inc)) {
    return { risk: 'accept', direction: 'bilateral', response: `ACCEPT — matches approved Fallback. ${prov?.fallback_tiers?.[0] ?? 'Retaining one legal-hold copy is standard and reciprocal.'}` }
  }
  // Affiliate liability broadened
  if (axis === 'affiliate') {
    return { risk: 'negotiate', direction: 'cp_unfavorable', response: 'Counter — limit responsibility to Affiliates that actually received Confidential Information; full liability for all Affiliates regardless of receipt is over-broad.' }
  }
  // Definition of Confidential Information broadened/clarified → favorable to the discloser, no issue.
  if (axis === 'definition' || axis === 'protection') {
    return { risk: 'accept', direction: 'bilateral', response: 'ACCEPT — broadened/clarified language consistent with ChargePoint\'s standard position (all non-public information; standard exclusions retained).' }
  }

  // Generic fallback: compare against the provision positions by similarity
  if (prov) {
    if (prov.tier === 'red_line') return { risk: 'red_line', direction: 'cp_unfavorable', response: `RED LINE — reject. ${prov.red_line}` }
    const fbHit = prov.fallback_tiers.findIndex((f) => similarity(diff.bText, f) > 0.28)
    if (fbHit >= 0) return { risk: 'negotiate', direction: 'cp_unfavorable', response: `Counter to Fallback ${fbHit + 1}: ${prov.fallback_tiers[fbHit]}` }
    if (similarity(diff.bText, prov.standard_position) > 0.3) return { risk: 'accept', direction: 'bilateral', response: 'ACCEPT — consistent with the ChargePoint standard position.' }
  }
  if (diff.kind === 'added') return { risk: 'new', direction: 'neutral', response: 'New counterparty-introduced language with no playbook match — flagged for attorney review.' }
  return { risk: 'negotiate', direction: 'cp_unfavorable', response: 'Deviation from the playbook — review and counter to the standard position.' }
}

// Provision name to preserve for a curated (tagged) clause, so the flagship
// issue list keeps its polished names while everything else stays computed.
const TAG_NAME: Record<string, string> = {
  'D-01': 'Term & Termination', 'D-02': 'Residuals Exclusion', 'D-03': 'Injunctive Relief',
  'D-04': 'Defined Term — "Proprietary Information"', 'D-05': 'Affiliate Liability',
  'D-06': 'Return / Destruction — Legal Copy', 'D-08': 'Data Privacy — Controller Designation',
  'D-09': 'Export Compliance',
}

// The analysis pass. Returns the issues list computed from (base → incoming).
export function analyzePlaybook(base: DocModel | undefined, incoming: DocModel | undefined, playbook: Playbook | undefined, agreementId: string, versionId: string): Deviation[] {
  if (!incoming || !base) return []
  const diffs = diffVersions(base, incoming)
  const out: Deviation[] = []
  let n = 0
  for (const diff of diffs) {
    // find the incoming clause to read its tag + heading
    const clause = incoming.clauses.find((c) => (c.ref || c.id) === diff.ref) ?? incoming.clauses.find((c) => c.heading === diff.heading)
    const tagged = clause?.deviationId
    const { provision, axis, label } = clause ? mapClauseToProvision(clause, playbook ?? { provisions: [] } as unknown as Playbook) : { provision: undefined, axis: undefined, label: diff.heading }
    // Deferred provisions are NOT included in AI review — no analysis card, no issue.
    if (provision?.tier === 'deferred') continue
    // Suppress cosmetic 'accept' changes that aren't a curated (tagged) issue, to avoid noise.
    const cls = classifyChange(diff, provision, axis)
    if (!tagged && cls.risk === 'accept') continue
    if (!tagged && diff.kind === 'modified' && !provision && cls.risk !== 'red_line') continue
    n++
    const category = provision?.cross_cutting_category
    out.push({
      id: tagged ?? `D-${versionId}-${n}`,
      version_id: versionId,
      agreement_id: agreementId,
      provision_name: (tagged && TAG_NAME[tagged]) || provision?.provision_name || label,
      section_reference: diff.ref,
      risk_category: cls.risk,
      direction: cls.direction,
      impact_area: category ? CATEGORY_IMPACT[category] : 'operational',
      template_position: provision?.standard_position ?? 'No playbook provision on point — manual attorney review.',
      counterparty_position: diff.bText || diff.aText,
      recommended_response: cls.response,
      disposition_status: 'open',
      source_clause_id: clause?.id,
      matched_provision_id: provision?.id,
    })
  }
  return out
}

// Compact provenance line for the Issues View header / agent reply.
export function analysisSummary(devs: Deviation[]): { total: number; red: number; neg: number; acc: number; qa: number } {
  return {
    total: devs.length,
    red: devs.filter((d) => d.risk_category === 'red_line').length,
    neg: devs.filter((d) => d.risk_category === 'negotiate').length,
    acc: devs.filter((d) => d.risk_category === 'accept').length,
    qa: devs.filter((d) => d.risk_category === 'enhancement' || d.risk_category === 'missing' || d.risk_category === 'new').length,
  }
}
