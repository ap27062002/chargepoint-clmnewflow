import type { Agreement, Ticket, Envelope, RiskCategory, DispositionStatus } from '@/types'

// ---- The signed / executed document content (final negotiated clean copy) ----
export interface ExecutedClause { ref: string; heading: string; text: string }
export interface ExecutedDoc {
  title: string
  parties: { cp: string; counterparty: string }
  effectiveDate: string
  clauses: ExecutedClause[]
}

const EXECUTED: Record<string, ExecutedDoc> = {
  'AGR-2201': {
    title: 'MUTUAL NONDISCLOSURE AGREEMENT',
    parties: { cp: 'ChargePoint, Inc.', counterparty: 'Vishay Intertechnology, Inc.' },
    effectiveDate: 'June 27, 2026',
    clauses: [
      { ref: '', heading: 'Recitals', text: 'This Mutual Nondisclosure Agreement (the "Agreement") is entered into as of the Effective Date by and between ChargePoint, Inc. ("ChargePoint") and Vishay Intertechnology, Inc. ("Counterparty"), each a "Party," to facilitate discussions regarding a potential business relationship (the "Purpose").' },
      { ref: '§1', heading: 'Confidential Information', text: '"Confidential Information" means all non-public business, technical, or financial information disclosed by one Party to the other that a reasonable person would understand to be confidential. The standard five exclusions apply (public domain, prior possession, independent development, rightful third-party receipt, and disclosure required by law).' },
      { ref: '§2', heading: 'Designation & Oral Disclosures', text: 'No marking is required for protection. Oral disclosures are confirmed in writing within thirty (30) days. All Confidential Information shall be protected as set forth herein. (Defined term "Confidential Information" used consistently throughout.)' },
      { ref: '§3', heading: 'Protection Obligations', text: 'Each receiving Party will protect the disclosing Party\'s Confidential Information using the same degree of care it uses for its own, but in no event less than a reasonable degree of care, and will use it solely for the Purpose.' },
      { ref: '§5', heading: 'Return or Destruction', text: 'Upon request or expiration, the receiving Party will return or destroy all Confidential Information and certify destruction within thirty (30) days, provided that one (1) archival copy may be retained for legal and compliance purposes subject to ongoing confidentiality.' },
      { ref: '§6', heading: 'Representatives & Affiliates', text: 'Each Party is responsible for breaches of this Agreement by its representatives and by Affiliates that receive Confidential Information under this Agreement.' },
      { ref: '§8', heading: 'Term & Termination', text: 'This Agreement remains in effect for three (3) years from the Effective Date. Confidentiality obligations survive for three (3) years following disclosure; trade secrets remain protected for as long as they qualify as trade secrets under applicable law.' },
      { ref: '§9', heading: 'Injunctive Relief', text: 'Each Party may seek injunctive relief for a breach, with any bond as the court deems appropriate, in addition to other remedies available at law or in equity.' },
      { ref: '§14', heading: 'Export Compliance', text: 'Each Party will comply with all applicable export-control laws and regulations, including the ITAR and EAR.' },
      { ref: '§16', heading: 'Governing Law', text: 'This Agreement is governed by the laws of the State of Delaware, with exclusive jurisdiction in the state and federal courts located in Delaware.' },
    ],
  },
  'AGR-2150': {
    title: 'MUTUAL NONDISCLOSURE AGREEMENT',
    parties: { cp: 'ChargePoint, Inc.', counterparty: 'Mondelez International, Inc.' },
    effectiveDate: 'May 19, 2026',
    clauses: [
      { ref: '§1', heading: 'Confidential Information', text: 'Broad definition with the standard five exclusions; obviously-confidential information protected without marking.' },
      { ref: '§2', heading: 'Marking / Identification', text: 'Marking required for written disclosures; oral disclosures confirmed in writing within thirty (30) days (approved Fallback 1).' },
      { ref: '§8', heading: 'Term & Termination', text: 'Two (2) year term; confidentiality survival of five (5) years; trade secrets protected indefinitely.' },
      { ref: '§9', heading: 'Injunctive Relief', text: 'Mutual injunctive relief, no bond required (unilateral indemnity proposed by counterparty was removed).' },
      { ref: '§16', heading: 'Governing Law', text: 'Delaware law; exclusive Delaware jurisdiction.' },
    ],
  },
  'AGR-2152': {
    title: 'MUTUAL NONDISCLOSURE AGREEMENT',
    parties: { cp: 'ChargePoint, Inc.', counterparty: 'Clever Devices Ltd.' },
    effectiveDate: 'May 21, 2026',
    clauses: [
      { ref: '§1', heading: 'Confidential Information', text: 'Standard definition; residuals clause from counterparty template struck.' },
      { ref: '§8', heading: 'Term & Termination', text: 'Three (3) year term; three (3) year confidentiality survival; trade-secret carve-out added.' },
      { ref: '§16', heading: 'Governing Law', text: 'New York (neutral) governing law, Fallback 2.' },
    ],
  },
  // MSA-type executed examples (R62/R105) — real MSA clause bodies so MSA playbook derivation +
  // cross-doc-type comparative analysis have non-NDA source text (not just NDAs).
  'AGR-2180': {
    title: 'MASTER SERVICES AGREEMENT',
    parties: { cp: 'ChargePoint, Inc.', counterparty: 'Northwind Utilities' },
    effectiveDate: 'June 2, 2026',
    clauses: [
      { ref: '§1', heading: 'Definitions', text: 'Defined terms including Charging Network, Station Data, Firmware, and Deliverables.' },
      { ref: '§7', heading: 'Indemnification', text: 'Mutual third-party IP-infringement indemnity with standard exclusions; indemnitor controls the defense; indemnitee may participate with its own counsel.' },
      { ref: '§8', heading: 'Limitation of Liability', text: 'Mutual cap at twelve (12) months of fees; consequential and indirect damages waived; carve-outs for confidentiality, indemnity, and IP.' },
      { ref: '§9', heading: 'Term & Termination', text: 'Initial two (2) year term, auto-renewing one (1) year; termination for cause with 30-day cure; termination for convenience with 90 days notice.' },
      { ref: '§10', heading: 'Governing Law', text: 'California law; exclusive jurisdiction in the state and federal courts located in California.' },
    ],
  },
  'AGR-2185': {
    title: 'MASTER SERVICES AGREEMENT',
    parties: { cp: 'ChargePoint, Inc.', counterparty: 'Evergreen Transit Authority' },
    effectiveDate: 'May 12, 2026',
    clauses: [
      { ref: '§7', heading: 'Indemnification', text: 'Mutual IP indemnity; super-cap of 2× fees for IP indemnity only (approved fallback).' },
      { ref: '§8', heading: 'Limitation of Liability', text: 'Cap at the greater of twelve (12) months of fees or $1M (approved fallback); consequential damages waived.' },
      { ref: '§9', heading: 'Term & Termination', text: 'Three (3) year term; termination for convenience after the initial term only.' },
      { ref: '§10', heading: 'Governing Law', text: 'Delaware law; exclusive Delaware jurisdiction.' },
    ],
  },
  // Two additional executed examples (R49/R50) — vary from the CP baseline so derivation has real signal.
  'AGR-2140': {
    title: 'MUTUAL NONDISCLOSURE AGREEMENT',
    parties: { cp: 'ChargePoint, Inc.', counterparty: 'Aptiv PLC' },
    effectiveDate: 'April 8, 2026',
    clauses: [
      { ref: '§1', heading: 'Confidential Information', text: 'Broad definition; marking required for written disclosures (Fallback 1).' },
      { ref: '§2', heading: 'Marking / Identification', text: 'Marking required; oral disclosures confirmed in writing within thirty (30) days.' },
      { ref: '§8', heading: 'Term & Termination', text: 'Two (2) year term; three (3) year confidentiality survival; trade secrets indefinite.' },
      { ref: '§16', heading: 'Governing Law', text: 'Delaware law; exclusive Delaware jurisdiction.' },
    ],
  },
  'AGR-2145': {
    title: 'MUTUAL NONDISCLOSURE AGREEMENT',
    parties: { cp: 'ChargePoint, Inc.', counterparty: 'TE Connectivity Ltd.' },
    effectiveDate: 'March 30, 2026',
    clauses: [
      { ref: '§1', heading: 'Confidential Information', text: 'Standard definition; no residuals.' },
      { ref: '§8', heading: 'Term & Termination', text: 'Three (3) year term; five (5) year confidentiality survival.' },
      { ref: '§9', heading: 'Injunctive Relief', text: 'Mutual injunctive relief; no bond.' },
      { ref: '§16', heading: 'Governing Law', text: 'New York governing law (Fallback 2).' },
    ],
  },
}

// R48/R50 — expose the executed corpus so the playbook-derivation + precedent engines read real clause text.
export function executedCorpus(): Record<string, ExecutedDoc> { return EXECUTED }

export function executedDoc(agreementId: string): ExecutedDoc | null {
  return EXECUTED[agreementId] ?? null
}

// R44 — real precedent corpus accessor: every executed agreement + its clause bodies.
// Consumed by lib/precedent.ts to ground the AI assistant in actual precedent (no fabrication).
export interface ExecutedRecord { agreementId: string; counterparty: string; effectiveDate: string; clauses: ExecutedClause[] }
export function precedentClauses(): ExecutedRecord[] {
  return Object.entries(EXECUTED).map(([agreementId, doc]) => ({
    agreementId, counterparty: doc.parties.counterparty, effectiveDate: doc.effectiveDate, clauses: doc.clauses,
  }))
}
// re-export for consumers that want to weigh precedent outcomes against a live deviation's category
export type { RiskCategory, DispositionStatus }

// ---- DocuSign-style completion certificate / execution details ---------------
export interface SignerRecord { name: string; org: string; email: string; signedAt: string; ip: string }
export interface ExecutionDetails {
  envelopeId: string
  certificateHash: string
  completedAt: string
  archivePath: string
  retention: string
  signers: SignerRecord[]
}

function hashHex(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0 }
  return ('0000000' + h.toString(16)).slice(-8)
}

export function executionDetails(agreement: Agreement, ticket: Ticket | undefined, envelope: Envelope | undefined): ExecutionDetails {
  const date = agreement.executed_date ?? envelope?.completed_date ?? '2026-06-27T10:08:00'
  const cp = ticket?.counterparty_name ?? 'Counterparty'
  const envId = envelope?.id ?? 'env_' + hashHex(agreement.id + 'env')
  const signers: SignerRecord[] = envelope?.state === 'completed'
    ? envelope.signers.map((s, i) => ({ name: s.name.replace(/\s*\(.*\)$/, ''), org: s.role === 'cp_signer' ? 'ChargePoint, Inc.' : cp, email: s.email, signedAt: s.signed_date ?? date, ip: i === 0 ? '40.122.18.7' : '203.0.113.42' }))
    : [
        { name: 'Eric Batill', org: 'ChargePoint, Inc.', email: 'eric.batill@chargepoint.com', signedAt: date, ip: '40.122.18.7' },
        { name: `${cp.split(' ')[0]} Authorized Signatory`, org: cp, email: 'legal@' + cp.toLowerCase().split(' ')[0] + '.com', signedAt: date, ip: '203.0.113.42' },
      ]
  return {
    envelopeId: envId,
    certificateHash: hashHex(agreement.id + date + 'cert').toUpperCase() + '-' + hashHex(envId).toUpperCase(),
    completedAt: date,
    archivePath: `SharePoint › Legal › Executed Agreements › ${cp} › ${agreement.id}.pdf`,
    retention: '7 years (immutable archive)',
    signers,
  }
}
