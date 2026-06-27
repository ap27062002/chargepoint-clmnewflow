// Structured document model for the Word-like viewer/editor (tracked changes + attribution).

export type RunType = 'normal' | 'ins' | 'del'
export type Party = 'cp' | 'counterparty'

export interface DocRun {
  text: string
  type?: RunType
  party?: Party
  cid?: string // stable change id — target for accept/reject
}

export interface DocClause {
  id: string
  ref: string
  heading: string
  runs: DocRun[]
  deviationId?: string
}

export interface DocModel {
  versionId: string
  title: string
  subtitle: string
  clauses: DocClause[]
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

// ---- V3: ChargePoint response (CP-attributed counters applied) ---------------
const insCpOurs = (text: string, cid: string): DocRun => ({ text, type: 'ins', party: 'cp', cid })
const delCpOurs = (text: string, cid: string): DocRun => ({ text, type: 'del', party: 'cp', cid })
const vishayV3 = (): DocModel => ({
  versionId: 'V-2201-3',
  title: TITLE,
  subtitle: 'ChargePoint, Inc. and Vishay Intertechnology, Inc. — V3 (ChargePoint Response, 2026-06-25)',
  clauses: [
    { id: 'c1f', ref: '§1(f)', heading: '1(f). Residuals', deviationId: 'D-02', runs: [
      delCpOurs('[Residuals clause struck in full — playbook red line]', 'r-1f'),
    ] },
    { id: 'c2', ref: '§2', heading: '2. Designation', deviationId: 'D-04', runs: [
      n('Oral disclosures confirmed within 30 days. '),
      delCpOurs('Proprietary Information', 'r-2del'), insCpOurs('Confidential Information', 'r-2ins'),
      n(' shall be protected as set forth herein (defined-term consistency corrected).'),
    ] },
    { id: 'c6', ref: '§6', heading: '6. Affiliates', deviationId: 'D-05', runs: [
      n('Each Party is responsible for breaches by its representatives'),
      insCpOurs(' and by Affiliates that receive Confidential Information under this Agreement', 'r-6'),
      n('.'),
    ] },
    { id: 'c8', ref: '§8', heading: '8. Term & Termination', deviationId: 'D-01', runs: [
      n('Term '), insCpOurs('three (3) years', 'r-8t'), n('; confidentiality survival '),
      delCpOurs('two (2) years', 'r-8s-del'), insCpOurs('three (3) years', 'r-8s-ins'),
      n('; trade secrets indefinite (Fallback 1).'),
    ] },
    { id: 'c9', ref: '§9', heading: '9. Injunctive Relief', deviationId: 'D-03', runs: [
      n('Mutual injunctive relief; bond '), insCpOurs('as the court deems appropriate', 'r-9'), n(' (Fallback 1).'),
    ] },
  ],
})

export function seedDocuments(): Record<string, DocModel> {
  return { 'V-2201-1': vishayV1(), 'V-2201-2': vishayDraft2(), 'V-2201-3': vishayV3() }
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
