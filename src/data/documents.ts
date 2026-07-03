// Structured document model for the Word-like viewer/editor (tracked changes + attribution).

export type RunType = 'normal' | 'ins' | 'del'
export type Party = 'cp' | 'counterparty'

export interface DocRun {
  text: string
  type?: RunType
  party?: Party
  cid?: string // stable change id — target for accept/reject
  linkTo?: string // dynamic cross-reference — clause id this text links to (renders as a link)
}

export interface DocClause {
  id: string
  ref: string
  heading: string
  runs: DocRun[]
  deviationId?: string
  level?: number // numbered-heading hierarchy: 1 → "1.", 2 → "1.1", 3 → "1.1.a"
  orig?: DocRun[] // snapshot before disposition-driven resolution — lets accept/reject/counter recompute idempotently
}

export interface DocModel {
  versionId: string
  title: string
  subtitle: string
  clauses: DocClause[]
  toc?: { label: string; clauseId: string }[] // auto-generated Table of Contents
  footnotes?: string[]                         // rendered at the end of the document
}

const n = (text: string): DocRun => ({ text, type: 'normal' })
const insCp = (text: string, cid: string): DocRun => ({ text, type: 'ins', party: 'counterparty', cid })
const delCp = (text: string, cid: string): DocRun => ({ text, type: 'del', party: 'counterparty', cid })

const TITLE = 'MUTUAL NONDISCLOSURE AGREEMENT'

// ---- V2: Draft 2 — counterparty redline (primary review surface) ------------
const vishayDraft2 = (): DocModel => ({
  versionId: 'V-2201-2',
  title: TITLE,
  subtitle: 'ChargePoint, Inc. and Vishay Intertechnology, Inc. — Draft 2 (Counterparty Redline, 2026-06-22)',
  clauses: [
    { id: 'c-preamble', ref: '', heading: '', runs: [
      n('This Mutual Nondisclosure Agreement (the "Agreement") is entered into as of the Effective Date by and between ChargePoint, Inc. ("ChargePoint") and Vishay Intertechnology, Inc. ("Counterparty"), each a "Party" and together the "Parties," to facilitate discussions regarding a potential business relationship (the "Purpose").'),
    ] },
    { id: 'c1', ref: '§1', heading: '1. Confidential Information', runs: [
      n('"Confidential Information" means all non-public business, technical, financial, or other information disclosed by one Party to the other, in any form, that is designated as confidential or that a reasonable person would understand to be confidential. '),
      n('The following are excluded: (a) public-domain information; (b) information in prior lawful possession; (c) independently developed information; (d) information rightfully received from a third party; and (e) information required to be disclosed by law.'),
    ] },
    { id: 'c1f', ref: '§1(f)', heading: '1(f). Residuals', deviationId: 'D-02', runs: [
      insCp(' (f) Notwithstanding the foregoing, either Party may use Residuals for any purpose, where "Residuals" means information retained in the unaided memory of personnel who have had access to the Confidential Information.', 'ch-1f'),
    ] },
    { id: 'c2', ref: '§2', heading: '2. Designation & Oral Disclosures', deviationId: 'D-04', runs: [
      n('No marking is required for information to be protected. Oral disclosures will be confirmed in writing within thirty (30) days. '),
      delCp('All Confidential Information shall be protected as set forth herein. ', 'ch-2del'),
      insCp('All Proprietary Information shall be protected as set forth herein. ', 'ch-2ins'),
      n('The receiving Party will limit access to representatives with a need to know.'),
    ] },
    { id: 'c3', ref: '§3', heading: '3. Protection Obligations', runs: [
      n('Each receiving Party will protect Confidential Information using the same degree of care it uses for its own confidential information, but no less than a reasonable degree of care, and will not use it except for the Purpose.'),
    ] },
    { id: 'c3e', ref: '§3(e)', heading: '3(e). Data Protection Roles', deviationId: 'D-08', runs: [
      insCp(' (e) For the purposes of any applicable data protection law, each Party shall act as a data controller in respect of personal data exchanged under this Agreement.', 'ch-3e'),
    ] },
    { id: 'c5', ref: '§5', heading: '5. Return or Destruction', deviationId: 'D-06', runs: [
      n('Upon written request or expiration, the receiving Party will return or destroy all Confidential Information and certify destruction within thirty (30) days; '),
      insCp('provided that the receiving Party may retain one (1) archival copy for legal and compliance purposes, subject to ongoing confidentiality.', 'ch-5'),
    ] },
    { id: 'c6', ref: '§6', heading: '6. Representatives & Affiliates', deviationId: 'D-05', runs: [
      n('Each Party is responsible for breaches of this Agreement by its representatives. '),
      insCp('Each Party shall be fully liable for any breach of this Agreement by any of its Affiliates, whether or not such Affiliate received Confidential Information hereunder.', 'ch-6'),
    ] },
    { id: 'c8', ref: '§8', heading: '8. Term & Termination', deviationId: 'D-01', runs: [
      n('This Agreement will remain in effect for '),
      delCp('two (2) years', 'ch-8t-del'), insCp('three (3) years', 'ch-8t-ins'),
      n(' from the Effective Date. The confidentiality obligations will survive for '),
      delCp('five (5) years', 'ch-8s-del'), insCp('two (2) years', 'ch-8s-ins'),
      n(' following disclosure; provided that trade secrets remain protected for as long as they qualify as trade secrets under applicable law.'),
    ] },
    { id: 'c9', ref: '§9', heading: '9. Injunctive Relief', deviationId: 'D-03', runs: [
      n('Each Party acknowledges that a breach may cause irreparable harm and that the non-breaching Party is entitled to seek injunctive relief '),
      delCp('without the necessity of posting a bond', 'ch-9-del'), insCp('upon posting a commercially reasonable bond', 'ch-9-ins'),
      n(', in addition to any other remedies available at law or in equity.'),
    ] },
    { id: 'c14', ref: '§14', heading: '14. Export Compliance', deviationId: 'D-09', runs: [
      n('Each Party will comply with all applicable export-control laws, including ITAR and EAR. '),
      insCp('Neither Party shall disclose Restricted Information without prior pre-clearance.', 'ch-14'),
    ] },
    { id: 'c-gov', ref: '§16', heading: '16. Governing Law', runs: [
      n('This Agreement is governed by the laws of the State of Delaware, and the Parties consent to the exclusive jurisdiction of the state and federal courts located in Delaware.'),
    ] },
  ],
})

// ---- V1: clean CP draft (no tracked changes, no counterparty additions) ------
const vishayV1 = (): DocModel => ({
  versionId: 'V-2201-1',
  title: TITLE,
  subtitle: 'ChargePoint, Inc. and Vishay Intertechnology, Inc. — V1 (ChargePoint draft, 2026-06-18)',
  clauses: [
    { id: 'c-preamble', ref: '', heading: '', runs: [n('This Mutual Nondisclosure Agreement is entered into between ChargePoint, Inc. and Vishay Intertechnology, Inc. to facilitate discussions regarding a potential business relationship (the "Purpose").')] },
    { id: 'c1', ref: '§1', heading: '1. Confidential Information', runs: [n('"Confidential Information" means all non-public information disclosed by one Party to the other that a reasonable person would understand to be confidential. Standard five exclusions apply.')] },
    { id: 'c2', ref: '§2', heading: '2. Designation & Oral Disclosures', runs: [n('No marking is required. Oral disclosures are confirmed in writing within thirty (30) days. All Confidential Information shall be protected as set forth herein.')] },
    { id: 'c3', ref: '§3', heading: '3. Protection Obligations', runs: [n('Each receiving Party will protect Confidential Information using the same degree of care it uses for its own, but no less than a reasonable degree of care.')] },
    { id: 'c5', ref: '§5', heading: '5. Return or Destruction', runs: [n('Upon request or expiration, return or destroy all Confidential Information and certify destruction within thirty (30) days.')] },
    { id: 'c6', ref: '§6', heading: '6. Representatives & Affiliates', runs: [n('Each Party is responsible for breaches of this Agreement by its representatives.')] },
    { id: 'c8', ref: '§8', heading: '8. Term & Termination', runs: [n('This Agreement remains in effect for two (2) years. Confidentiality obligations survive for five (5) years; trade secrets remain protected indefinitely.')] },
    { id: 'c9', ref: '§9', heading: '9. Injunctive Relief', runs: [n('Each Party may seek injunctive relief without the necessity of posting a bond, in addition to other remedies.')] },
    { id: 'c14', ref: '§14', heading: '14. Export Compliance', runs: [n('Each Party will comply with all applicable export-control laws, including ITAR and EAR.')] },
    { id: 'c-gov', ref: '§16', heading: '16. Governing Law', runs: [n('Governed by the laws of the State of Delaware; exclusive jurisdiction in Delaware.')] },
  ],
})

// ---- V3: the ChargePoint WORKING COPY (Eric §2/§3 — the attorney reviews V3, not V2) ----
// Auto-created on Draft 2 intake; carries the counterparty's tracked changes for the attorney to
// accept/reject/edit, then becomes the basis for the send-back clean copy + redline.
const vishayV3 = (): DocModel => ({
  ...vishayDraft2(),
  versionId: 'V-2201-3',
  subtitle: 'ChargePoint working copy (V3) — accept / reject the counterparty\'s changes, edit, then send back',
})

// ---- V3 CLEAN: full clean working copy (all counters accepted → no tracked changes) ----
// Used as the working doc for the send-back redline (V-2201-3 is sparse; this is the full document).
const vishayV3Clean = (): DocModel => ({
  versionId: 'V-2201-3C',
  title: TITLE,
  subtitle: 'ChargePoint, Inc. and Vishay Intertechnology, Inc. — V3 (ChargePoint clean working copy, 2026-06-25)',
  clauses: [
    { id: 'c-preamble', ref: '', heading: '', runs: [n('This Mutual Nondisclosure Agreement (the "Agreement") is entered into as of the Effective Date by and between ChargePoint, Inc. ("ChargePoint") and Vishay Intertechnology, Inc. ("Counterparty"), each a "Party" and together the "Parties," to facilitate discussions regarding a potential business relationship (the "Purpose").')] },
    { id: 'c1', ref: '§1', heading: '1. Confidential Information', runs: [n('"Confidential Information" means all non-public business, technical, financial, or other information disclosed by one Party to the other, in any form, that is designated as confidential or that a reasonable person would understand to be confidential. The following are excluded: (a) public-domain information; (b) information in prior lawful possession; (c) independently developed information; (d) information rightfully received from a third party; and (e) information required to be disclosed by law.')] },
    { id: 'c2', ref: '§2', heading: '2. Designation & Oral Disclosures', deviationId: 'D-04', runs: [n('No marking is required for information to be protected. Oral disclosures will be confirmed in writing within thirty (30) days. All Confidential Information shall be protected as set forth herein. The receiving Party will limit access to representatives with a need to know.')] },
    { id: 'c3', ref: '§3', heading: '3. Protection Obligations', runs: [n('Each receiving Party will protect Confidential Information using the same degree of care it uses for its own confidential information, but no less than a reasonable degree of care, and will not use it except for the Purpose.')] },
    { id: 'c3e', ref: '§3(e)', heading: '3(e). Data Protection Roles', deviationId: 'D-08', runs: [n('For the purposes of any applicable data protection law, each Party shall act as an independent data controller in respect of personal data exchanged under this Agreement.')] },
    { id: 'c5', ref: '§5', heading: '5. Return or Destruction', deviationId: 'D-06', runs: [n('Upon written request or expiration, the receiving Party will return or destroy all Confidential Information and certify destruction within thirty (30) days; provided that the receiving Party may retain one (1) archival copy for legal and compliance purposes, subject to ongoing confidentiality.')] },
    { id: 'c6', ref: '§6', heading: '6. Representatives & Affiliates', deviationId: 'D-05', runs: [n('Each Party is responsible for breaches of this Agreement by its representatives, and by Affiliates that receive Confidential Information under this Agreement.')] },
    { id: 'c8', ref: '§8', heading: '8. Term & Termination', deviationId: 'D-01', runs: [n('This Agreement will remain in effect for three (3) years from the Effective Date. The confidentiality obligations will survive for three (3) years following disclosure; provided that trade secrets remain protected for as long as they qualify as trade secrets under applicable law.')] },
    { id: 'c9', ref: '§9', heading: '9. Injunctive Relief', deviationId: 'D-03', runs: [n('Each Party acknowledges that a breach may cause irreparable harm and that the non-breaching Party is entitled to seek injunctive relief, with any bond as the court deems appropriate, in addition to any other remedies available at law or in equity.')] },
    { id: 'c14', ref: '§14', heading: '14. Export Compliance', deviationId: 'D-09', runs: [n('Each Party will comply with all applicable export-control laws, including ITAR and EAR.')] },
    { id: 'c-gov', ref: '§16', heading: '16. Governing Law', runs: [n('This Agreement is governed by the laws of the State of Delaware, and the Parties consent to the exclusive jurisdiction of the state and federal courts located in Delaware.')] },
  ],
})


// ---- Northwind MSA — formatting-fidelity showcase (numbered hierarchy, footnote,
// cross-reference link, auto-TOC) + the counterparty's v2 redline (DN-01 / DN-02). ----
const northwindV2 = (): DocModel => ({
  versionId: 'V-2180-2',
  title: 'MASTER SERVICES AGREEMENT',
  subtitle: 'ChargePoint, Inc. and Northwind Energy — v2 (Counterparty Response, 19 Jun 2026)',
  toc: [
    { label: '1. Definitions', clauseId: 'nw-c1' },
    { label: '\u2002 1.1 Charging Network', clauseId: 'nw-c1-1' },
    { label: '\u2002\u2002 1.1.a Station Data', clauseId: 'nw-c1-1a' },
    { label: '3. Services', clauseId: 'nw-c3' },
    { label: '\u2002 3.2 Deliverables', clauseId: 'nw-c3-2' },
    { label: '8. Term & Termination', clauseId: 'nw-c8' },
    { label: '10. Indemnification', clauseId: 'nw-c10' },
    { label: '12. Limitation of Liability', clauseId: 'nw-c12' },
  ],
  footnotes: ['\u00b9 "Station Data" includes charging-session telemetry, utilization and interval data collected across the Charging Network, whether or not associated with an identifiable driver.'],
  clauses: [
    { id: 'nw-c1', ref: '\u00a71', heading: '1. Definitions', level: 1, runs: [
      n('Capitalized terms have the meanings set out in this Section 1 or where otherwise defined in this Agreement.'),
    ] },
    { id: 'nw-c1-1', ref: '\u00a71.1', heading: '1.1 Charging Network', level: 2, runs: [
      n('"Charging Network" means the electric-vehicle charging stations, associated hardware and cloud services owned or operated by ChargePoint and made available to Customer under this Agreement.'),
    ] },
    { id: 'nw-c1-1a', ref: '\u00a71.1.a', heading: '1.1.a Station Data', level: 3, runs: [
      n('"Station Data"\u00b9 means the data generated by the Charging Network. ChargePoint retains all right, title and interest in Station Data; Customer receives aggregated, de-identified analytics only.'),
    ] },
    { id: 'nw-c3', ref: '\u00a73', heading: '3. Services', level: 1, runs: [
      n('ChargePoint will provide the charging-as-a-service program described in each Order Form, including installation, operation and maintenance of the Charging Network at Customer sites.'),
    ] },
    { id: 'nw-c3-2', ref: '\u00a73.2', heading: '3.2 Deliverables', level: 2, runs: [
      n('"Deliverables" means the reports, analytics dashboards and documentation identified in an Order Form, excluding the Charging Network hardware itself and any ChargePoint background IP.'),
    ] },
    { id: 'nw-c8', ref: '\u00a78', heading: '8. Term & Termination', level: 1, runs: [
      n('This Agreement begins on the Effective Date and continues for an initial term of two (2) years, automatically renewing for successive one (1) year periods. Either party may terminate for cause on thirty (30) days\u2019 written notice and failure to cure.'),
    ] },
    { id: 'nw-c10', ref: '\u00a710', heading: '10. Indemnification', level: 1, deviationId: 'DN-02', runs: [
      n('ChargePoint will defend and indemnify Customer against third-party claims that the Deliverables infringe intellectual-property rights, subject to the exclusions in Section 10.2'),
      delCp(' and provided that ChargePoint controls the defense and settlement of any such claim', 'nw-ch-10del'),
      insCp('. ChargePoint shall further indemnify Customer against ALL claims of any kind arising out of or related to this Agreement, including claims arising from Customer\u2019s own breach of contract', 'nw-ch-10ins'),
      n('.'),
    ] },
    { id: 'nw-c12', ref: '\u00a712', heading: '12. Limitation of Liability', level: 1, deviationId: 'DN-01', runs: [
      n('Except for the Excluded Claims, and excluding any misuse of the Deliverables '),
      { text: 'as defined in Section 3.2', type: 'normal', linkTo: 'nw-c3-2' },
      n(', '),
      delCp('each party\u2019s aggregate liability under this Agreement is capped at the fees paid or payable in the twelve (12) months preceding the claim', 'nw-ch-12del'),
      insCp('ChargePoint\u2019s aggregate liability under this Agreement is capped at the fees paid in the twelve (12) months preceding the claim; no cap shall apply to Customer\u2019s remedies', 'nw-ch-12ins'),
      n(', and neither party is liable for consequential, indirect or punitive damages.'),
    ] },
  ],
})
const northwindV3 = (): DocModel => ({
  ...northwindV2(),
  versionId: 'V-2180-3',
  subtitle: 'ChargePoint working copy (v3) \u2014 accept / reject Northwind\u2019s changes, edit, then send back',
})

export function seedDocuments(): Record<string, DocModel> {
  return { 'V-2201-1': vishayV1(), 'V-2201-2': vishayDraft2(), 'V-2201-3': vishayV3(), 'V-2201-3C': vishayV3Clean(), 'V-2180-2': northwindV2(), 'V-2180-3': northwindV3() }
}

// The clean working-copy id for an agreement's working version (prototype: Vishay only).
export const cleanCopyId = (agreementId: string): string => (agreementId === 'AGR-2201' ? 'V-2201-3C' : '')

// R18 — map a versionId back to its agreement (runtime `AGR-2201-5`, seeded `V-2201-3`).
export function agreementIdForVersion(versionId: string): string {
  const runtime = versionId.match(/^(AGR-\d+)-\d+$/); if (runtime) return runtime[1]
  const seeded = versionId.match(/^V-(\d+)-/); if (seeded) return 'AGR-' + seeded[1]
  return ''
}

// Clause id that a deviation maps to, within a given doc (deviation↔clause is via DocClause.deviationId).
export function clauseIdForDeviation(doc: DocModel | undefined, deviationId: string): string | undefined {
  return doc?.clauses.find((c) => c.deviationId === deviationId)?.id
}

// Apply tracked changes → a clean DocModel (insertions kept, deletions dropped, one normal run/clause).
export function buildCleanCopy(doc: DocModel): DocModel {
  return {
    ...doc,
    clauses: doc.clauses.map((c) => ({ ...c, runs: [{ text: effectiveText(c), type: 'normal' as const }] })).filter((c) => c.runs[0].text.length > 0),
  }
}

// Effective ("if accepted") plain text of a clause: keep normal + insertions, drop deletions.
export function effectiveText(c: DocClause): string {
  return c.runs.filter((r) => r.type !== 'del').map((r) => r.text).join('').trim()
}

export interface ClauseDiff { ref: string; heading: string; kind: 'added' | 'removed' | 'modified' | 'unchanged'; aText: string; bText: string }
export function diffVersions(a: DocModel, b: DocModel): ClauseDiff[] {
  const ids = Array.from(new Set([...a.clauses.map((c) => c.id), ...b.clauses.map((c) => c.id)]))
  const out: ClauseDiff[] = []
  for (const id of ids) {
    const ca = a.clauses.find((c) => c.id === id)
    const cb = b.clauses.find((c) => c.id === id)
    const ref = (cb ?? ca)!.ref || id
    const heading = (cb ?? ca)!.heading || ref
    const aText = ca ? effectiveText(ca) : ''
    const bText = cb ? effectiveText(cb) : ''
    let kind: ClauseDiff['kind'] = 'unchanged'
    if (ca && !cb) kind = 'removed'
    else if (!ca && cb) kind = 'added'
    else if (aText !== bText) kind = 'modified'
    if (kind !== 'unchanged') out.push({ ref, heading, kind, aText, bText })
  }
  return out
}

// ---- Word-level redline (build-12, Eric §3 — clean copy + redline) -----------
import type { RedlineDoc, RedlineClause, RedlineRun, RedlineRunKind, ChangeSummary, SummaryAudience, Deviation } from '@/types'

const tokenize = (s: string): string[] => s.split(/(\s+)/).filter((t) => t.length > 0)

// LCS word diff → tracked-change runs (normal / ins / del), Word-redline style.
export function wordDiff(a: string, b: string): RedlineRun[] {
  const A = tokenize(a), B = tokenize(b)
  const m = A.length, k = B.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(k + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) for (let j = k - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const runs: RedlineRun[] = []
  const push = (text: string, kind: RedlineRunKind) => { const last = runs[runs.length - 1]; if (last && last.kind === kind) last.text += text; else runs.push({ text, kind }) }
  let i = 0, j = 0
  while (i < m && j < k) {
    if (A[i] === B[j]) { push(A[i], 'normal'); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push(A[i], 'del'); i++ }
    else { push(B[j], 'ins'); j++ }
  }
  while (i < m) push(A[i++], 'del')
  while (j < k) push(B[j++], 'ins')
  return runs
}

// Build a full-document redline of `working` (our clean copy) vs `base` (their last version).
export function buildRedlineDoc(base: DocModel, working: DocModel, cumulative: boolean): RedlineDoc {
  const ids = Array.from(new Set([...base.clauses.map((c) => c.id), ...working.clauses.map((c) => c.id)]))
  const clauses: RedlineClause[] = []
  let changeCount = 0
  for (const id of ids) {
    const cb = base.clauses.find((c) => c.id === id)
    const cw = working.clauses.find((c) => c.id === id)
    const ref = (cw ?? cb)!.ref || id
    const heading = (cw ?? cb)!.heading || ref
    const baseText = cb ? effectiveText(cb) : ''
    const workText = cw ? effectiveText(cw) : ''
    let status: RedlineClause['status'] = 'unchanged'
    if (cb && !cw) status = 'removed'
    else if (!cb && cw) status = 'added'
    else if (baseText !== workText) status = 'modified'
    if (status !== 'unchanged') changeCount++
    const runs: RedlineRun[] = status === 'unchanged'
      ? [{ text: workText, kind: 'normal' }]
      : status === 'removed' ? [{ text: baseText, kind: 'del' }]
      : status === 'added' ? [{ text: workText, kind: 'ins' }]
      : wordDiff(baseText, workText)
    clauses.push({ ref, heading, status, runs })
  }
  return {
    baseVersionId: base.versionId, workingVersionId: working.versionId,
    title: working.title, subtitle: `Redline — our ${working.versionId} vs ${base.versionId}${cumulative ? ' (cumulative)' : ''}`,
    clauses, cumulative, changeCount,
  }
}

// AI-style summary of the redline (internal for a colleague / external for the counterparty).
export function summarizeRedline(rl: RedlineDoc, devs: Deviation[], audience: SummaryAudience): ChangeSummary {
  const changed = rl.clauses.filter((c) => c.status !== 'unchanged')
  const devByRef = new Map(devs.map((d) => [d.section_reference, d]))
  const bullets = changed.map((c) => {
    const dev = devByRef.get(c.ref)
    const verb = c.status === 'removed' ? 'Struck' : c.status === 'added' ? 'Added' : 'Revised'
    if (audience === 'internal') return `${verb} ${c.ref} ${c.heading.replace(/^[\d.()§ ]+/, '')} — ${dev ? dev.recommended_response : 'aligned to playbook'}.`
    return `${verb} ${c.ref} (${c.heading.replace(/^[\d.()§ ]+/, '')}) to reflect ChargePoint's standard position.`
  })
  return {
    audience,
    headline: audience === 'internal'
      ? `ChargePoint response to Vishay Draft 2 — ${rl.changeCount} change${rl.changeCount === 1 ? '' : 's'}`
      : `Summary of ChargePoint's revisions (${rl.changeCount} change${rl.changeCount === 1 ? '' : 's'})`,
    bullets,
    generatedAt: '2026-06-30T10:08:00.000Z',
  }
}
